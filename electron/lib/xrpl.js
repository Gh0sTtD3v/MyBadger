const axios = require('axios')
const { upsertNFTs } = require('./db')
const llm   = require('./llm')

const XRPL_RPC     = 'https://xrplcluster.com'
const IPFS_GATEWAY = 'https://nftstorage.link/ipfs/'

function hexToString(hex) {
  if (!hex) return null
  try { return Buffer.from(hex, 'hex').toString('utf8') } catch { return null }
}

function normalizeUrl(url) {
  if (!url) return null
  if (url.startsWith('ipfs://'))  return IPFS_GATEWAY + url.slice(7)
  if (url.startsWith('ar://'))    return 'https://arweave.net/' + url.slice(5)
  return url
}

async function fetchPeripheral(url) {
  try {
    const res  = await axios.get(url, { timeout: 15000, responseType: 'text' })
    const text = typeof res.data === 'string' ? res.data.trim() : null
    if (text && (text.startsWith('{') || text.startsWith('['))) {
      return JSON.parse(text)
    }
  } catch {}
  return null
}

function stripArweave(url) {
  if (!url) return url
  const match = url.match(/^(https:\/\/arweave\.net\/[^/?]+)/)
  return match ? match[1] : url
}

async function extractImageFromPeripheral(json) {
  if (json.description) {
    const match = json.description.match(/<img[^>]+src=["']([^"']+)["']/i)
    if (match) return stripArweave(match[1])
  }
  const raw = json.image || json.image_url || json.animation_url || null
  if (raw) return stripArweave(raw)
  return await llm.extractImageUrl(json)
}

async function fetchXrplNfts(address) {
  const nfts   = []
  let   marker = undefined

  while (true) {
    const res    = await axios.post(XRPL_RPC, {
      method: 'account_nfts',
      params: [{ account: address, limit: 400, ...(marker ? { marker } : {}) }],
    })
    const result = res.data?.result
    if (!result || result.error) break
    nfts.push(...(result.account_nfts || []))
    if (!result.marker) break
    marker = result.marker
  }

  return nfts
}

async function runXrpl(wallets, send) {
  let totalIndexed = 0

  for (const wallet of wallets) {
    if (!wallet) continue

    send({ type: 'log', message: `Scanning XRPL wallet ${wallet}...` })

    const nfts = await fetchXrplNfts(wallet)
    const rows = []

    for (const nft of nfts) {
      const uriStr    = hexToString(nft.URI)
      const uriUrl    = normalizeUrl(uriStr)
      let   imageUrl  = uriUrl
      let   peripheral = null

      if (uriUrl) {
        peripheral = await fetchPeripheral(uriUrl)
        if (peripheral) {
          const extracted = await extractImageFromPeripheral(peripheral)
          if (extracted) imageUrl = normalizeUrl(extracted)
        }
      }

      rows.push({
        id:          `xrpl_${nft.NFTokenID}`,
        wallet,
        chain:       'xrpl',
        name:        peripheral?.name || `NFT #${nft.nft_serial ?? nft.NFTokenID.slice(0, 8)}`,
        description: peripheral?.description || null,
        tokenId:     nft.NFTokenID,
        contract:    { address: nft.Issuer, name: null },
        collection:  { name: peripheral?.collection?.name || null },
        image:       { originalUrl: imageUrl, cachedUrl: null, thumbnailUrl: imageUrl },
        animation:   { originalUrl: null },
        peripheral,
        raw:         nft,
      })
    }

    await upsertNFTs(rows)
    totalIndexed += rows.length
    send({ type: 'log', message: `  xrpl: ${rows.length} NFTs` })
  }

  return totalIndexed
}

module.exports = { runXrpl }

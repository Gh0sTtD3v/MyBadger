const axios = require('axios')
const { upsertNFTs } = require('./db')

const COUNTERPARTY = 'https://api.counterparty.io:4000'
const IPFS_GATEWAY = 'https://nftstorage.link/ipfs/'

function normalizeUrl(url) {
  if (!url) return null
  if (url.startsWith('ipfs://')) return IPFS_GATEWAY + url.slice(7)
  if (url.startsWith('ar://'))   return 'https://arweave.net/' + url.slice(5)
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

function extractImageFromPeripheral(json) {
  if (json.description) {
    const match = json.description.match(/<img[^>]+src=["']([^"']+)["']/i)
    if (match) return stripArweave(match[1])
  }
  const raw = json.image || json.image_url || json.animation_url || null
  return stripArweave(raw)
}

// Get candidate URL from description — could be inline JSON, ipfs://, ar://, or https://
function extractCandidateUrl(description) {
  if (!description) return null
  try {
    const obj = JSON.parse(description)
    return normalizeUrl(obj.image || obj.image_url || obj.url || null)
  } catch {}
  const ipfsMatch = description.match(/ipfs:\/\/\S+/)
  if (ipfsMatch) return normalizeUrl(ipfsMatch[0])
  const arMatch = description.match(/ar:\/\/\S+/)
  if (arMatch) return normalizeUrl(arMatch[0])
  const httpMatch = description.match(/https?:\/\/\S+/)
  if (httpMatch) return httpMatch[0]
  return null
}

async function fetchBalances(address) {
  const items  = []
  let   cursor = null

  while (true) {
    const params = { limit: 100, ...(cursor ? { cursor } : {}) }
    const res    = await axios.get(`${COUNTERPARTY}/v2/addresses/${address}/balances`, { params })
    const data   = res.data?.result || []
    items.push(...data.filter(b => b.quantity > 0 && b.asset !== 'XCP' && b.asset !== 'BTC'))
    cursor = res.data?.next_cursor
    if (!cursor) break
  }

  return items
}

async function fetchAsset(asset) {
  try {
    const res = await axios.get(`${COUNTERPARTY}/v2/assets/${asset}`)
    return res.data?.result || null
  } catch {
    return null
  }
}

async function runXcp(wallets, send) {
  let totalIndexed = 0

  for (const wallet of wallets) {
    if (!wallet) continue

    send({ type: 'log', message: `Scanning XCP wallet ${wallet}...` })

    const balances = await fetchBalances(wallet)
    const rows = []

    for (const b of balances) {
      const assetInfo    = await fetchAsset(b.asset)
      const description  = assetInfo?.description || ''
      let   candidateUrl = extractCandidateUrl(description)
      let   imageUrl     = candidateUrl
      let   peripheral   = null

      if (candidateUrl) {
        peripheral = await fetchPeripheral(candidateUrl)
        if (peripheral) {
          const extracted = extractImageFromPeripheral(peripheral)
          if (extracted) imageUrl = normalizeUrl(extracted)
        }
      }

      rows.push({
        id:          `xcp_${b.asset}`,
        wallet,
        chain:       'xcp',
        name:        peripheral?.name || b.asset,
        description: peripheral?.description || description || null,
        tokenId:     b.asset,
        contract:    { address: assetInfo?.issuer || null, name: 'Counterparty' },
        collection:  { name: 'Counterparty' },
        image:       { originalUrl: imageUrl, cachedUrl: null, thumbnailUrl: imageUrl },
        animation:   { originalUrl: null },
        peripheral,
        raw:         { balance: b, asset: assetInfo },
      })
    }

    await upsertNFTs(rows)
    totalIndexed += rows.length
    send({ type: 'log', message: `  xcp: ${rows.length} assets` })
  }

  return totalIndexed
}

module.exports = { runXcp }

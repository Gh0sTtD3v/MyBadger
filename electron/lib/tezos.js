const axios = require('axios')
const { upsertNFTs } = require('./db')

const TZKT = 'https://api.tzkt.io/v1'
const LIMIT = 1000
const IPFS_GATEWAY = 'https://nftstorage.link/ipfs/'

function normalizeUrl(url) {
  if (!url) return null
  if (url.startsWith('ipfs://')) return IPFS_GATEWAY + url.slice(7)
  return url
}

async function fetchTezosWallet(wallet) {
  const nfts = []
  let offset = 0

  while (true) {
    const res = await axios.get(`${TZKT}/tokens/balances`, {
      params: { account: wallet, 'balance.gt': 0, 'token.standard': 'fa2', limit: LIMIT, offset },
    })
    nfts.push(...res.data)
    if (res.data.length < LIMIT) break
    offset += LIMIT
  }

  return nfts
}

async function runTezos(wallets, send) {
  let totalIndexed = 0

  for (const wallet of wallets) {
    // Tezos addresses start with tz1 / tz2 / tz3 / KT1
    if (!wallet || !/^(tz|KT)/i.test(wallet)) continue

    send({ type: 'log', message: `Scanning Tezos wallet ${wallet}...` })

    const balances = await fetchTezosWallet(wallet)

    const rows = balances.map(b => {
      const meta = b.token?.metadata || {}
      return {
        id:         `tezos_${b.token.contract.address}_${b.token.tokenId}`,
        wallet,
        chain:      'tezos',
        name:        meta.name        || null,
        description: meta.description || null,
        tokenId:     b.token.tokenId,
        contract:  { address: b.token.contract.address, name: meta.symbol || null },
        collection:{ name: meta.symbol || null },
        image:     { originalUrl: normalizeUrl(meta.displayUri || meta.thumbnailUri || meta.artifactUri), cachedUrl: null, thumbnailUrl: normalizeUrl(meta.thumbnailUri) },
        animation: { originalUrl: normalizeUrl(meta.artifactUri) },
        // preserve raw TzKT data
        tzkt: b,
      }
    })

    await upsertNFTs(rows)
    totalIndexed += rows.length
    send({ type: 'log', message: `  tezos: ${rows.length} tokens` })
  }

  return totalIndexed
}

module.exports = { runTezos }

const axios = require('axios')
const { upsertNFTs } = require('./db')

const ME     = 'https://api-mainnet.magiceden.dev/v2'
const LIMIT  = 500

async function fetchSolanaWallet(address) {
  const nfts   = []
  let   offset = 0

  while (true) {
    const res = await axios.get(`${ME}/wallets/${address}/tokens`, {
      params: { offset, limit: LIMIT, listStatus: 'unlisted' },
      headers: { 'Accept': 'application/json' },
    })
    const data = res.data || []
    nfts.push(...data)
    if (data.length < LIMIT) break
    offset += LIMIT
  }

  return nfts
}

async function runSolana(wallets, send) {
  let totalIndexed = 0

  for (const wallet of wallets) {
    if (!wallet) continue

    send({ type: 'log', message: `Scanning Solana wallet ${wallet}...` })

    const nfts = await fetchSolanaWallet(wallet)

    const rows = nfts.map(nft => ({
      id:          `solana_${nft.mintAddress}`,
      wallet,
      chain:       'solana',
      name:        nft.name || null,
      description: null,
      tokenId:     nft.mintAddress,
      contract:    { address: nft.mintAddress, name: nft.collection || null },
      collection:  { name: nft.collection || null },
      image:       { originalUrl: nft.image || null, cachedUrl: null, thumbnailUrl: nft.image || null },
      animation:   { originalUrl: nft.animationUrl || null },
      raw:         nft,
    }))

    await upsertNFTs(rows)
    totalIndexed += rows.length
    send({ type: 'log', message: `  solana: ${rows.length} NFTs` })
  }

  return totalIndexed
}

module.exports = { runSolana }

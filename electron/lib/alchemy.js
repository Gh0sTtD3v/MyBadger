const axios = require('axios')
const { upsertNFTs } = require('./db')

const ALL_CHAINS = {
  eth:      'eth-mainnet',
  base:     'base-mainnet',
  arbitrum: 'arb-mainnet',
  optimism: 'opt-mainnet',
  apechain: 'apechain-mainnet',
  bnb:      'bnb-mainnet',
}

async function fetchChain(wallet, chainName, endpoint, apiKey) {
  const baseUrl = `https://${endpoint}.g.alchemy.com/nft/v3/${apiKey}`
  const nfts = []
  let pageKey = null

  do {
    const url = `${baseUrl}/getNFTsForOwner?owner=${wallet}&withMetadata=true${pageKey ? `&pageKey=${pageKey}` : ''}`
    const response = await axios.get(url)
    nfts.push(...response.data.ownedNfts)
    pageKey = response.data.pageKey
  } while (pageKey)

  return nfts
}

// wallets = [{ address, chains }]
async function runAlchemy(apiKey, wallets, send) {
  let totalIndexed = 0

  for (const { address, chains: walletChains } of wallets) {
    const chainEntries = (walletChains || [])
      .filter(c => ALL_CHAINS[c])
      .map(c => [c, ALL_CHAINS[c]])

    if (!chainEntries.length) continue

    send({ type: 'log', message: `Scanning ${address}...` })

    const results = await Promise.all(
      chainEntries.map(([chainName, endpoint]) =>
        fetchChain(address, chainName, endpoint, apiKey).then(nfts =>
          nfts.map(nft => ({
            id: chainName === 'solana'
              ? `solana_${nft.mint}`
              : `${chainName}_${nft.contract?.address?.toLowerCase()}_${nft.tokenId}`,
            wallet: address,
            chain:  chainName,
            ...nft,
          }))
        )
      )
    )

    const rows = results.flat()
    await upsertNFTs(rows)
    totalIndexed += rows.length

    for (let i = 0; i < results.length; i++) {
      send({ type: 'log', message: `  ${chainEntries[i][0]}: ${results[i].length}` })
    }
    send({ type: 'log', message: `  subtotal: ${rows.length}` })
  }

  send({ type: 'done', message: `Indexed ${totalIndexed} NFTs`, total: totalIndexed })
}

async function fetchContract(contractAddress, endpoint, apiKey) {
  const baseUrl = `https://${endpoint}.g.alchemy.com/nft/v3/${apiKey}`
  const nfts = []
  let pageKey = null

  do {
    const params = `contractAddress=${contractAddress}&withMetadata=true&limit=100${pageKey ? `&pageKey=${pageKey}` : ''}`
    const response = await axios.get(`${baseUrl}/getNFTsForContract?${params}`)
    nfts.push(...response.data.nfts)
    pageKey = response.data.pageKey
  } while (pageKey)

  return nfts
}

async function runContract(apiKey, contracts, send) {
  let totalIndexed = 0

  for (const { address, chain } of contracts) {
    const endpoint = ALL_CHAINS[chain]
    if (!endpoint) continue

    send({ type: 'log', message: `Scanning contract ${address} on ${chain}...` })

    const nfts = await fetchContract(address, endpoint, apiKey)

    const rows = nfts.map(nft => ({
      id:    `${chain}_${nft.contract?.address?.toLowerCase()}_${nft.tokenId}`,
      wallet: null,
      chain,
      ...nft,
    }))
    
    await upsertNFTs(rows)
    totalIndexed += rows.length
    send({ type: 'log', message: `  ${rows.length} NFTs indexed` })
  }

  send({ type: 'done', message: `Indexed ${totalIndexed} NFTs`, total: totalIndexed })
}

module.exports = { runAlchemy, runContract, ALL_CHAINS }

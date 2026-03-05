const axios = require('axios')
const { upsertNFTs } = require('./db')

const HIRO  = 'https://api.hiro.so/ordinals/v1'
const LIMIT = 60

async function fetchBtcWallet(address) {
  const inscriptions = []
  let offset = 0

  while (true) {
    const res = await axios.get(`${HIRO}/inscriptions`, {
      params: { address, limit: LIMIT, offset },
    })
    inscriptions.push(...res.data.results)
    if (inscriptions.length >= res.data.total) break
    offset += LIMIT
  }

  return inscriptions
}

async function runBtc(wallets, send) {
  let totalIndexed = 0

  for (const wallet of wallets) {
    if (!wallet) continue

    send({ type: 'log', message: `Scanning BTC wallet ${wallet}...` })

    const inscriptions = await fetchBtcWallet(wallet)

    const rows = inscriptions.map(ins => {
      const contentUrl = `${HIRO}/inscriptions/${ins.id}/content`
      const isImage    = ins.mime_type?.startsWith('image/')
      const isVideo    = ins.mime_type?.startsWith('video/')
      const isHtml     = ins.mime_type?.includes('html')

      return {
        id:          `btc_${ins.id}`,
        wallet,
        chain:       'btc',
        name:        `Inscription #${ins.number}`,
        description: null,
        tokenId:     String(ins.number),
        contract:    { address: ins.genesis_tx_id, name: 'Ordinals' },
        collection:  { name: 'Bitcoin Ordinals' },
        image:       {
          originalUrl:  isImage ? contentUrl : null,
          cachedUrl:    null,
          thumbnailUrl: isImage ? contentUrl : null,
        },
        animation:   { originalUrl: (isVideo || isHtml) ? contentUrl : null },
        raw: ins,
      }
    })

    await upsertNFTs(rows)
    totalIndexed += rows.length
    send({ type: 'log', message: `  btc: ${rows.length} inscriptions` })
  }

  return totalIndexed
}

module.exports = { runBtc }

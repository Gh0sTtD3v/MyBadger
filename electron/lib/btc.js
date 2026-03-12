const axios = require('axios')
const { upsertNFTs } = require('./db')

const BASE = 'https://open-api.unisat.io'


async function fetchBtcWallet(address, token) {
  const inscriptions = []
  let cursor = 0
  const size = 100

  while (true) {
    const url = `${BASE}/v1/indexer/address/${address}/inscription-utxo-data`
    let res
    try {
      res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        params: { cursor, size },
      })
    } catch (err) {
      const status = err.response?.status
      const body   = JSON.stringify(err.response?.data)
      throw new Error(`UniSat GET ${url} → ${status}: ${body}`)
    }
    if (res.data.code !== 0) throw new Error(`UniSat error (code ${res.data.code}): ${res.data.msg}`)
    const { list = [], total } = res.data.data
    inscriptions.push(...list)
    if (inscriptions.length >= total) break
    cursor += size
  }

  return inscriptions
}

async function runBtc(wallets, send, apiKey) {
  let totalIndexed = 0

  for (const wallet of wallets) {
    if (!wallet) continue

    send({ type: 'log', message: `Scanning BTC wallet ${wallet}...` })

    const inscriptions = await fetchBtcWallet(wallet, apiKey)

    const rows = inscriptions.map(ins => {
      const isImage = ins.contentType?.startsWith('image/')
      const isVideo = ins.contentType?.startsWith('video/')
      const isHtml  = ins.contentType?.includes('html')
      const contentUrl = ins.contentUrl || null

      return {
        id:          `btc_${ins.inscriptionId}`,
        wallet,
        chain:       'btc',
        name:        ins.name || `Inscription #${ins.inscriptionNumber}`,
        description: null,
        tokenId:     String(ins.inscriptionNumber),
        contract:    { address: ins.inscriptionId, name: 'Ordinals' },
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

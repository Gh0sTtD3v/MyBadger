const { app, BrowserWindow, ipcMain, protocol, net, dialog } = require('electron')
const path = require('path')
const { pathToFileURL } = require('url')

const db = require('./lib/db')
const { runAlchemy, runContract, ALL_CHAINS } = require('./lib/alchemy')
const { runTezos } = require('./lib/tezos')
const { runBtc }   = require('./lib/btc')
const { runXcp }   = require('./lib/xcp')
const { runXrpl }   = require('./lib/xrpl')
const { runSolana } = require('./lib/solana')
const { runCurate } = require('./lib/curate')
const ipfs = require('./lib/ipfs')
const llm  = require('./lib/llm')
const { generateWallpaperHtml, generateProjectJson } = require('./lib/wallpaper')
const fs = require('fs')

const DEV_URL = 'http://localhost:3131'
const isDev   = !app.isPackaged

protocol.registerSchemesAsPrivileged([
  { scheme: 'nftmedia', privileges: { secure: true, supportFetchAPI: true, stream: true, bypassCSP: true } },
])

function createWindow() {
  const win = new BrowserWindow({
    width: 1200, height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '..', 'public', 'logo.png')
  })
  isDev ? win.loadURL(DEV_URL) : win.loadFile(path.join(__dirname, '..', 'out', 'index.html'))
}

app.whenReady().then(() => {
  db.initDb(app.getPath('userData'))
  ipfs.initIpfs(app.getPath('userData'))
  llm.initLlm(app.getPath('userData'))

  protocol.handle('nftmedia', (request) => {
    const filepath = decodeURIComponent(new URL(request.url).pathname.replace(/^\//, ''))
    return net.fetch(pathToFileURL(path.join(db.getMediaDir(), filepath)).href, { headers: request.headers })
  })

  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('before-quit', () => ipfs.stopIpfs())

ipcMain.handle('llm:status',   () => llm.getStatus())
ipcMain.handle('llm:download', async (event) => {
  const result = await llm.downloadModel(p => event.sender.send('llm-event', p))
  if (result.ok) await llm.initLlm(app.getPath('userData'))
  return result
})

ipcMain.handle('ipfs:status', () => ipfs.getStatus())
ipcMain.handle('ipfs:unpin', async (_e, { nftId, cid }) => {
  try { await ipfs.unpinCid(cid) } catch (err) { return { error: err.message } }
  await db.patchRawNft(nftId, { cid: null })
  return { ok: true }
})
ipcMain.handle('ipfs:pin', async (_e, { curationId, nftId, localPath }) => {
  const fullPath = require('path').join(db.getMediaDir(), localPath)
  const cid = await ipfs.pinFile(fullPath)
  if (cid) await db.patchCuratedNft(curationId, nftId, { cid })
  return { cid }
})
ipcMain.handle('ipfs:pinUrl', async (_e, { nftId, url }) => {
  const axios = require('axios')
  const mediaBase = db.getMediaDir()
  const dir = path.join(mediaBase, nftId)
  fs.mkdirSync(dir, { recursive: true })

  const fetchUrl = url
    .replace('ipfs://', 'https://nftstorage.link/ipfs/')
    .replace('ar://', 'https://arweave.net/')

  const EXT_MAP = {
    'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif',
    'image/webp': '.webp', 'image/svg+xml': '.svg', 'image/avif': '.avif',
    'video/mp4': '.mp4', 'video/webm': '.webm', 'video/ogg': '.ogv',
  }

  let localFile
  try {
    const response = await axios.get(fetchUrl, {
      responseType: 'stream',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://opensea.io/',
      },
    })
    const urlExt = fetchUrl.match(/\.(png|jpg|jpeg|gif|webp|svg|avif|mp4|webm|ogv|mov)(\?|$)/i)?.[1]
    const ext = urlExt ? '.' + urlExt.toLowerCase() : (EXT_MAP[response.headers['content-type']] || '.bin')
    localFile = path.join(dir, 'original' + ext)
    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(localFile)
      response.data.pipe(writer)
      writer.on('finish', resolve)
      writer.on('error', reject)
      response.data.on('error', reject)
    })
  } catch (err) {
    return { cid: null, error: err.message }
  }

  let cid
  try {
    cid = await ipfs.pinFile(localFile)
  } catch (err) {
    return { cid: null, error: `pin failed: ${err.message}` }
  }

  const localPath = path.join(nftId, path.basename(localFile))
  await db.patchRawNft(nftId, { cid, localPath })
  return { cid }
})

function send(event, payload) { event.sender.send('script-event', payload) }

// ── Alchemy ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// wallets = [{ address, chains }]
ipcMain.handle('run-alchemy', async (event, { apiKey, wallets }) => {
  try {
    const alchemyWallets = wallets.filter(w => Array.isArray(w.chains) && w.chains.some(c => c in ALL_CHAINS))
    const tezosAddresses = wallets.filter(w => w.chains.includes('tezos')).map(w => w.address)
    const solanaAddresses = wallets.filter(w => w.chains.includes('solana')).map(w => w.address)
    const btcAddresses    = wallets.filter(w => w.chains.includes('btc')).map(w => w.address)
    const xcpAddresses   = wallets.filter(w => w.chains.includes('xcp')).map(w => w.address)
    const xrplAddresses  = wallets.filter(w => w.chains.includes('xrpl')).map(w => w.address)
    let total = 0

    if (alchemyWallets.length) {
      await runAlchemy(apiKey, alchemyWallets, (p) => {
        if (p.type === 'done') total += p.total || 0
        else send(event, p)
      })
    }

    if (tezosAddresses.length) {
      total += await runTezos(tezosAddresses, (p) => send(event, p))
    }

    if (solanaAddresses.length) {
      total += await runSolana(solanaAddresses, (p) => send(event, p))
    }

    if (btcAddresses.length) {
      total += await runBtc(btcAddresses, (p) => send(event, p))
    }

    if (xcpAddresses.length) {
      total += await runXcp(xcpAddresses, (p) => send(event, p))
    }

    if (xrplAddresses.length) {
      total += await runXrpl(xrplAddresses, (p) => send(event, p))
    }

    send(event, { type: 'done', message: `Indexed ${total} NFTs`, total })
  } catch (err) {
    send(event, { type: 'error', message: err.message })
  }
})

ipcMain.handle('run-contract', async (event, { apiKey, contracts }) => {
  try { await runContract(apiKey, contracts, (p) => send(event, p)) }
  catch (err) { send(event, { type: 'error', message: err.message }) }
})

// ── Raw NFTs ────────────────────────────────────────────────────────────────────────────────────────────────────────────
ipcMain.handle('raw:query',         async (_e, filters)                 => db.queryRawNfts(filters))
ipcMain.handle('raw:getById',       async (_e, id)                      => db.getRawNftById(id))
ipcMain.handle('raw:count',         async ()                            => db.getRawNftCount())
ipcMain.handle('raw:distinct',      async (_e, field)                   => db.getDistinctRawValues(field))
ipcMain.handle('raw:clear',         async ()                            => db.clearRawNfts())

// ── Curations ───────────────────────────────────────────────────────────────────────────────────────────────────────────
ipcMain.handle('curations:list',    async ()                            => db.listCurations())
ipcMain.handle('curations:create',  async (_e, name)                    => db.createCuration(name))
ipcMain.handle('curations:delete',  async (_e, id)                      => db.deleteCuration(id))
ipcMain.handle('curations:get',     async (_e, id)                      => db.getCurationById(id))

// ── Curated NFTs ────────────────────────────────────────────────────────────────────────────────────────────────────────
ipcMain.handle('curated:nfts',      async (_e, { curationId, filters }) => db.getCuratedNfts(curationId, filters))
ipcMain.handle('curated:ids',       async (_e, curationId)              => db.getCuratedNftIds(curationId))
ipcMain.handle('curated:stats',     async (_e, curationId)              => db.getCurationStats(curationId))
ipcMain.handle('curated:distinct',  async (_e, { curationId, field })   => db.getDistinctCuratedValues(curationId, field))
ipcMain.handle('curated:remove',    async (_e, { curationId, nftIds })  => db.removeCuratedNfts(curationId, nftIds))

// ── Settings ────────────────────────────────────────────────────────────────────────────────────────────────────────────
ipcMain.handle('settings:getMediaDir', () => db.getMediaDir())
ipcMain.handle('settings:setMediaDir', (_e, newPath) => db.setMediaDir(newPath))
ipcMain.handle('dialog:selectFolder',  async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory'] })
  return canceled ? null : filePaths[0]
})

// ── Wallpaper ───────────────────────────────────────────────────────────────────────────────────────────────────────────
ipcMain.handle('wallpaper:generate', async (_e, { curationId, curationName }) => {
  const { rows } = await db.getCuratedNfts(curationId, { limit: 9999 })
  const withMedia = rows.filter(n => n.localPath)

  if (!withMedia.length) return { error: 'No local media found in this curation.' }

  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Select folder to save wallpaper project into',
    properties: ['openDirectory'],
  })

  if (canceled || !filePaths.length) return { canceled: true }

  const safeName   = (curationName || 'wallpaper').replace(/[^\w\s\-]/g, '_')
  const projectDir = path.join(filePaths[0], safeName)
  fs.mkdirSync(projectDir, { recursive: true })

  const mediaDir = db.getMediaDir()
  const items = []

  for (const n of withMedia) {
    const srcPath  = path.join(mediaDir, n.localPath)
    // Flatten e.g. "eth_0xabc_1/original.jpg" → "eth_0xabc_1_original.jpg"
    const filename = n.localPath.replace(/[\\/]/g, '_')
    const destPath = path.join(projectDir, filename)
    try {
      fs.copyFileSync(srcPath, destPath)
      items.push({ src: filename, type: n.mediaType || 'image' })
    } catch (_) {
      // skip files that can't be copied
    }
  }

  if (!items.length) return { error: 'Failed to copy any media files.' }

  fs.writeFileSync(path.join(projectDir, 'index.html'),   generateWallpaperHtml(items, curationName || 'Wallpaper'), 'utf8')
  fs.writeFileSync(path.join(projectDir, 'project.json'), generateProjectJson(curationName || 'Wallpaper'),          'utf8')

  return { filePath: projectDir }
})

// ── Export JSON ─────────────────────────────────────────────────────────────────────────────────────────────────────────
ipcMain.handle('curations:exportJson', async (_e, { curationId, curationName }) => {
  const { rows } = await db.getCuratedNfts(curationId, { limit: 9999 })

  const items = []
  for (const n of rows) {
    const raw = await db.getRawNftById(n.nftId)
    items.push({
      id:          n.nftId,
      name:        n.name,
      description: raw?.description || null,
      chain:       n.chain,
      wallet:      n.wallet,
      collection:  n.collection,
      contract:    n.contract    || null,
      tokenId:     n.tokenId     || null,
      imageUrl:    n.imageUrl    || null,
      videoUrl:    n.videoUrl    || null,
      cid:         n.cid         || null,
    })
  }

  const safeName = (curationName || 'collection').replace(/[^\w\s\-]/g, '_')
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Save NFT Collection JSON',
    defaultPath: `${safeName}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  })

  if (canceled || !filePath) return { canceled: true }

  fs.writeFileSync(filePath, JSON.stringify({
    curation:  curationName,
    generated: new Date().toISOString(),
    total:     items.length,
    items,
  }, null, 2), 'utf8')

  return { filePath }
})

// ── Curate ────────────────────────────────────────────────
ipcMain.handle('curate:run', async (event, { curationId, nftIds }) => {
  try { await runCurate(curationId, nftIds, (p) => send(event, p)) }
  catch (err) { send(event, { type: 'error', message: err.message }) }
})
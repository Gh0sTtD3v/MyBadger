const fs = require('fs')
const path = require('path')
const axios = require('axios')
const sharp = require('sharp')
const { getPendingDownloads, updateLocalPath, getMediaDir } = require('./db')

const MAX_SIZE = 4096
const DELAY = 500

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif']
const VIDEO_EXTS = ['.mp4', '.webm', '.ogv', '.mov']
const ALL_EXTS = [...IMAGE_EXTS, ...VIDEO_EXTS]

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

function getExt(url, contentType) {
  const urlExt = url.match(/\.(png|jpg|jpeg|gif|webp|svg|avif|mp4|webm|ogv|mov)(\?|$)/i)?.[1]?.toLowerCase()
  if (urlExt) return '.' + urlExt
  const typeMap = {
    'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif',
    'image/webp': '.webp', 'image/svg+xml': '.svg', 'image/avif': '.avif',
    'video/mp4': '.mp4', 'video/webm': '.webm', 'video/ogg': '.ogv', 'video/quicktime': '.mov',
  }
  return typeMap[contentType] || '.png'
}

const isVideo = (ext) => VIDEO_EXTS.includes(ext)

function normalizeUrl(url) {
  if (!url) return null
  if (url.includes('?')) url = url.split('?')[0]
  url = url.replace('ipfs://', 'https://nftstorage.link/ipfs/')
  url = url.replace('https://ipfs.io/ipfs/', 'https://nftstorage.link/ipfs/')
  return url
}

async function download(url, baseFilename) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 })
    let buffer = Buffer.from(response.data)
    const ext = getExt(url, response.headers['content-type'])
    const filename = baseFilename + ext

    if (!isVideo(ext) && ext !== '.svg' && ext !== '.gif') {
      const image = sharp(buffer)
      const meta = await image.metadata()
      if (meta.width > MAX_SIZE || meta.height > MAX_SIZE) {
        buffer = await image.resize(MAX_SIZE, MAX_SIZE, { fit: 'inside', withoutEnlargement: true }).toBuffer()
      }
    }

    fs.writeFileSync(filename, buffer)
    return { success: true, ext }
  } catch (err) {
    return { error: err.message }
  }
}

async function runDownloadRaw(send) {
  const MEDIA_DIR = getMediaDir()
  const pending = await getPendingDownloads()
  const total = pending.length
  let downloaded = 0, skipped = 0, failed = 0, videos = 0

  for (let i = 0; i < total; i++) {
    const nft = pending[i]
    const videoUrl = normalizeUrl(nft.animation?.originalUrl || null)
    const imageUrl = normalizeUrl(nft.image?.originalUrl || nft.image?.cachedUrl || null)

    if (!videoUrl && !imageUrl) {
      send({ type: 'progress', current: i + 1, total, status: 'skipped', id: nft.id, message: 'No media URL' })
      skipped++
      continue
    }

    const baseFilename = path.join(MEDIA_DIR, nft.id)
    const existing = ALL_EXTS.find(ext => fs.existsSync(baseFilename + ext))
    if (existing) {
      send({ type: 'progress', current: i + 1, total, status: 'skipped', id: nft.id, message: 'Already exists' })
      skipped++
      continue
    }

    send({ type: 'progress', current: i + 1, total, status: 'downloading', id: nft.id, message: nft.name || nft.id })

    let result = null
    if (videoUrl) {
      result = await download(videoUrl, baseFilename)
      if (result?.success && isVideo(result.ext)) videos++
    }
    if (!result?.success && imageUrl) {
      try {
        result = await download(imageUrl, baseFilename)
      } catch (err) {
        const pngUrl = nft.image?.pngUrl || null
        if (pngUrl) {
          send({ type: 'progress', current: i + 1, total, status: 'retrying', id: nft.id, message: 'Retrying with PNG URL' })
          result = await download(normalizeUrl(pngUrl), baseFilename)
        }
      }
    }

    if (result?.success) {
      const filename = nft.id + result.ext
      await updateLocalPath(nft.id, filename, isVideo(result.ext) ? 'video' : 'image')
      downloaded++
    } else {
      failed++
    }

    await sleep(DELAY)
  }

  send({
    type: 'done',
    message: `Done: ${downloaded} downloaded (${videos} videos), ${skipped} skipped, ${failed} failed`,
    downloaded, skipped, failed, videos,
  })
}

module.exports = { runDownloadRaw }

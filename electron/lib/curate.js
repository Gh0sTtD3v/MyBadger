const fs = require('fs')
const path = require('path')
const axios = require('axios')
const sharp = require('sharp')
const { getMediaDir, getRawNftById, upsertCuratedNft } = require('./db')

const MAX_SIZE = 2048
const THUMB_SIZE = 400
const DELAY = 300

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif']
const VIDEO_EXTS = ['.mp4', '.webm', '.ogv', '.mov']
const ALL_EXTS   = [...IMAGE_EXTS, ...VIDEO_EXTS]

const sleep   = (ms) => new Promise(r => setTimeout(r, ms))
const isVideo = (ext) => VIDEO_EXTS.includes(ext)

function normalizeUrl(url) {
  if (!url) return null
  if (url.includes('?')) url = url.split('?')[0]
  url = url.replace('ipfs://', 'https://nftstorage.link/ipfs/')
  url = url.replace('https://ipfs.io/ipfs/', 'https://nftstorage.link/ipfs/')
  url = url.replace('ar://', 'https://arweave.net/')
  return url
}


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

async function download(url, baseFilename) {
  let ext = null
  try {
    const response = await axios.get(url, { responseType: 'stream', timeout: 30000 })
    ext = getExt(url, response.headers['content-type'])
    const filename = baseFilename + ext

    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(filename)
      response.data.pipe(writer)
      writer.on('finish', resolve)
      writer.on('error', reject)
      response.data.on('error', reject)
    })

    return { success: true, ext }
  } catch (err) {
    // if (ext) try { fs.unlinkSync(baseFilename + ext) } catch {}
    return { error: err.message }
  }
}

async function runCurate(curationId, nftIds, send) {
  const mediaBase = getMediaDir()
  const total = nftIds.length
  let done = 0, failed = 0

  for (let i = 0; i < total; i++) {
    const nftId = nftIds[i]
    const nft   = await getRawNftById(nftId)

    if (!nft) {
      send({ type: 'progress', current: i + 1, total, status: 'failed', message: `Not found: ${nftId}` })
      failed++
      continue
    }

    const dir = path.join(mediaBase, nftId)
    fs.mkdirSync(dir, { recursive: true })

    // ── Original ──────────────────────────────────────────
    let localPath = null
    let mediaType = null
    const existingExt = ALL_EXTS.find(ext => fs.existsSync(path.join(dir, 'original' + ext)))

    if (existingExt) {
      localPath = path.join(nftId, 'original' + existingExt)
      mediaType = isVideo(existingExt) ? 'video' : 'image'
    } else {
      const videoUrl = normalizeUrl(nft.animation?.originalUrl)
      let imageUrl = normalizeUrl(nft.image?.originalUrl || nft.image?.cachedUrl)
      let result = null

      if (videoUrl) {
        result = await download(videoUrl, path.join(dir, 'original'))
        if (result?.success) mediaType = isVideo(result.ext) ? 'video' : 'image'
      }
      if (!result?.success && imageUrl) {
        result = await download(imageUrl, path.join(dir, 'original'))
        if (result?.success) {
          mediaType = isVideo(result.ext) ? 'video' : 'image'
        }
        else {
          imageUrl = nft.image?.pngUrl || null
          if (imageUrl) {
            send({ type: 'progress', current: i + 1, total, status: 'retrying', id: nft.id, message: 'Retrying with PNG URL' })
            result = await download(normalizeUrl(imageUrl), path.join(dir, 'original'))
            if (result?.success) mediaType = isVideo(result.ext) ? 'video' : 'image'
          }
        }
      }
      if (result?.success) {
        localPath = path.join(nftId, 'original' + result.ext)
      }
    }

    // ── Thumbnail ─────────────────────────────────────────
    let thumbPath = null
    const thumbFile = path.join(dir, 'thumb.jpg')

    if (fs.existsSync(thumbFile)) {
      thumbPath = path.join(nftId, 'thumb.jpg')
    } else if (localPath && mediaType === 'image') {
      try {
        await sharp(path.join(mediaBase, localPath))
          .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'cover' })
          .jpeg({ quality: 80 })
          .toFile(thumbFile)
        thumbPath = path.join(nftId, 'thumb.jpg')
      } catch (_) {}
    }

    // ── Upsert to curated collection ──────────────────────
    await upsertCuratedNft({
      curationId,
      nftId,
      name:       nft.name || nft.contract?.name || 'Unknown',
      collection: nft.collection?.name || nft.contract?.name || 'Unknown',
      chain:      nft.chain,
      wallet:     nft.wallet,
      contract:   nft.contract?.address,
      tokenId:    nft.tokenId,
      mediaType,
      localPath,
      thumbPath,
      imageUrl:   nft.image?.originalUrl || nft.image?.cachedUrl || null,
      videoUrl:   nft.animation?.originalUrl || null,
    })

    done++
    send({ type: 'progress', current: i + 1, total, status: 'done', message: nft.name || nftId })
    await sleep(DELAY)
  }

  send({ type: 'done', message: `Curated ${done} NFTs${failed ? `, ${failed} failed` : ''}`, done, failed })
}

module.exports = { runCurate }

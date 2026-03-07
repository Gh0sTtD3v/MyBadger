const path = require('path')
const fs   = require('fs')

const MODEL_URI  = 'hf:bartowski/Phi-3.5-mini-instruct-GGUF/Phi-3.5-mini-instruct-Q4_K_M.gguf'
const MODEL_FILE = 'Phi-3.5-mini-instruct-Q4_K_M.gguf'

let llama       = null
let model       = null
let context     = null
let modelsDir   = null
let initError   = null
let downloading = false

function modelPath() { return path.join(modelsDir, MODEL_FILE) }
function isDownloaded() { return !!modelsDir && fs.existsSync(modelPath()) }
function isReady() { return !!model }

async function initLlm(dataDir) {
  modelsDir = path.join(dataDir, 'models')
  if (!isDownloaded()) return

  try {
    const { getLlama } = await import('node-llama-cpp')
    llama   = await getLlama()
    model   = await llama.loadModel({ modelPath: modelPath() })
    context = await model.createContext({ contextSize: 4096 })
  } catch (err) {
    initError = err.message
  }
}

async function downloadModel(onProgress) {
  if (!modelsDir) return { error: 'not initialized' }
  if (downloading)  return { error: 'already downloading' }

  downloading = true
  fs.mkdirSync(modelsDir, { recursive: true })

  try {
    const { createModelDownloader } = await import('node-llama-cpp')
    const downloader = await createModelDownloader({
      modelUri:   MODEL_URI,
      dirPath:    modelsDir,
      onProgress: p => onProgress({ downloaded: p.downloadedSize, total: p.totalSize }),
    })
    await downloader.download()

    downloading = false
    return { ok: true }
  } catch (err) {
    downloading = false
    return { error: err.message }
  }
}

async function extractImageUrl(json) {
  if (!model || !context) return null

  try {
    const { LlamaChatSession } = await import('node-llama-cpp')
    const session = new LlamaChatSession({ contextSequence: context.getSequence() })

    const response = await session.prompt(
      `Extract the primary media URL (image or video) from this NFT metadata JSON.\n` +
      `Return ONLY the raw URL. If none found, return: null\n\n` +
      JSON.stringify(json),
      { maxTokens: 100 }
    )

    const url = response.trim().replace(/^["']|["']$/g, '')
    if (url === 'null' || url === '' ) return null
    if (!url.startsWith('http') && !url.startsWith('ipfs') && !url.startsWith('ar://')) return null
    return url
  } catch {
    return null
  }
}

function getStatus() {
  return { ready: isReady(), downloaded: isDownloaded(), downloading, error: initError, modelFile: MODEL_FILE }
}

module.exports = { initLlm, downloadModel, extractImageUrl, isReady, getStatus }

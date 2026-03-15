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

function findModelFile() {
  if (!modelsDir || !fs.existsSync(modelsDir)) return null
  function search(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) { const found = search(full); if (found) return found }
      else if (entry.name.endsWith('.gguf')) return full
    }
    return null
  }
  return search(modelsDir)
}

function isDownloaded() { return !!findModelFile() }
function isReady() { return !!model }

function setModelsDir(dir) { modelsDir = dir }
function getModelsDir()    { return modelsDir }

async function initLlm(dataDir, customDir) {
  modelsDir = customDir || path.join(dataDir, 'models')
  const found = findModelFile()
  if (!found) return

  try {
    const { getLlama } = await import('node-llama-cpp')
    llama   = await getLlama()
    model   = await llama.loadModel({ modelPath: found })
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

async function extractImageUrl(json, onRaw) {
  if (!model || !context) return null

  const sequence = context.getSequence()
  try {
    const { LlamaChatSession } = await import('node-llama-cpp')
    const session = new LlamaChatSession({ contextSequence: sequence })

    const prompt =
      `You are a data extraction tool. Your only job is to find a media URL in an NFT metadata JSON object.\n` +
      `Rules:\n` +
      `- Look at fields like: image, image_url, animation_url, animation, media, content, uri\n` +
      `- Prefer animation_url or animation over image when both exist\n` +
      `- URLs may start with: https://, http://, ipfs://, ar://\n` +
      `- Output ONLY the URL — no explanation, no punctuation, no quotes\n` +
      `- If no URL exists, output only the word: null\n\n` +
      `JSON:\n${JSON.stringify(json, null, 2)}`

    const response = await session.prompt(prompt, { maxTokens: 150 })
    const raw = response.trim()

    if (onRaw) onRaw(raw)

    // Try regex first — works even if model adds extra words
    const match = raw.match(/(https?:\/\/[^\s"'<>]+|ipfs:\/\/[^\s"'<>]+|ar:\/\/[^\s"'<>]+)/)
    if (match) return match[1]

    // Fallback: clean the response and check directly
    const clean = raw.replace(/^["'`]+|["'`]+$/g, '').split(/\s+/)[0]
    if (!clean || clean.toLowerCase() === 'null') return null
    if (clean.startsWith('http') || clean.startsWith('ipfs') || clean.startsWith('ar://')) return clean

    return null
  } catch (err) {
    if (onRaw) onRaw(`ERROR: ${err.message}`)
    return null
  } finally {
    sequence.dispose?.()
  }
}

function getStatus() {
  return { ready: isReady(), downloaded: isDownloaded(), downloading, error: initError, modelFile: MODEL_FILE }
}

module.exports = { initLlm, setModelsDir, getModelsDir, downloadModel, extractImageUrl, isReady, getStatus }

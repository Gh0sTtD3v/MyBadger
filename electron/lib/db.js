const Datastore = require('@seald-io/nedb')
const path = require('path')
const fs = require('fs')

let nfts, curations, curatedNfts
let MEDIA_DIR
let settingsPath

function loadSettings() {
  try { return JSON.parse(fs.readFileSync(settingsPath, 'utf8')) } catch { return {} }
}

function saveSettings(data) {
  fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2))
}

function initDb(dataDir) {
  settingsPath = path.join(dataDir, 'settings.json')
  const settings = loadSettings()
  MEDIA_DIR = settings.mediaDir || path.join(dataDir, 'media')
  fs.mkdirSync(MEDIA_DIR, { recursive: true })

  nfts = new Datastore({ filename: path.join(dataDir, 'nfts.db'), autoload: true })
  nfts.ensureIndex({ fieldName: 'id', unique: true })
  nfts.ensureIndex({ fieldName: 'wallet' })
  nfts.ensureIndex({ fieldName: 'chain' })

  curations = new Datastore({ filename: path.join(dataDir, 'curations.db'), autoload: true })

  curatedNfts = new Datastore({ filename: path.join(dataDir, 'curated-nfts.db'), autoload: true })
  curatedNfts.ensureIndex({ fieldName: 'nftId' })
  curatedNfts.ensureIndex({ fieldName: 'curationId' })
  curatedNfts.ensureIndex({ fieldName: 'chain' })
  curatedNfts.ensureIndex({ fieldName: 'collection' })
}

function getMediaDir() { return MEDIA_DIR }

function setMediaDir(newPath) {
  MEDIA_DIR = newPath
  fs.mkdirSync(MEDIA_DIR, { recursive: true })
  const settings = loadSettings()
  settings.mediaDir = newPath
  saveSettings(settings)
}

// ── Raw NFTs ──────────────────────────────────────────────

async function upsertNFTs(rows) {
  for (const row of rows) {
    await nfts.updateAsync({ id: row.id }, { $set: row }, { upsert: true })
  }
}

async function patchRawNft(id, fields) {
  await nfts.updateAsync({ id }, { $set: fields })
}

async function clearRawNfts() {
  await nfts.removeAsync({}, { multi: true })
  await nfts.compactDatafileAsync()
}

async function queryRawNfts({ search, chain, wallet, limit = 50, offset = 0 } = {}) {
  const query = {}
  if (chain)  query.chain  = chain
  if (wallet) query.wallet = wallet
  if (search) query.$or = [{ name: new RegExp(search, 'i') }, { 'contract.name': new RegExp(search, 'i') }, { 'collection.name': new RegExp(search, 'i') }]
  const rows  = await nfts.findAsync(query, { id: 1, name: 1, chain: 1, wallet: 1, tokenId: 1, contract: 1, collection: 1, image: 1, animation: 1, cid: 1 }).skip(offset).limit(limit)
  const total = await nfts.countAsync(query)
  return { rows, total }
}

async function getDistinctRawValues(field) {
  const docs = await nfts.findAsync({}, { [field]: 1 })
  return [...new Set(docs.map(d => d[field]).filter(Boolean))].sort()
}

async function getRawNftById(id) {
  return nfts.findOneAsync({ id })
}

async function getRawNftCount() {
  return nfts.countAsync({})
}

// ── Curations ─────────────────────────────────────────────

async function createCuration(name) {
  return curations.insertAsync({ name, createdAt: Date.now() })
}

async function listCurations() {
  return curations.findAsync({}).sort({ createdAt: -1 })
}

async function getCurationById(id) {
  return curations.findOneAsync({ _id: id })
}

async function deleteCuration(id) {
  await curatedNfts.removeAsync({ curationId: id }, { multi: true })
  await curations.removeAsync({ _id: id })
}

// ── Curated NFTs ──────────────────────────────────────────

async function removeCuratedNfts(curationId, nftIds) {
  await curatedNfts.removeAsync({ curationId, nftId: { $in: nftIds } }, { multi: true })
}

async function patchCuratedNft(curationId, nftId, fields) {
  await curatedNfts.updateAsync({ curationId, nftId }, { $set: fields })
}

async function upsertCuratedNft(doc) {
  await curatedNfts.updateAsync(
    { curationId: doc.curationId, nftId: doc.nftId },
    { $set: doc },
    { upsert: true }
  )
}

async function getCuratedNftIds(curationId) {
  const docs = await curatedNfts.findAsync({ curationId }, { nftId: 1 })
  return docs.map(d => d.nftId)
}

async function getCuratedNfts(curationId, { chain, search, limit = 80, offset = 0 } = {}) {
  const query = { curationId }
  if (chain)  query.chain = chain
  if (search) query.$or = [{ name: new RegExp(search, 'i') }, { collection: new RegExp(search, 'i') }]
  const rows  = await curatedNfts.findAsync(query).skip(offset).limit(limit)
  const total = await curatedNfts.countAsync(query)
  return { rows, total }
}

async function getDistinctCuratedValues(curationId, field) {
  const docs = await curatedNfts.findAsync({ curationId }, { [field]: 1 })
  const counts = {}
  for (const d of docs) {
    const v = d[field]
    if (v) counts[v] = (counts[v] || 0) + 1
  }
  return Object.entries(counts).map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count)
}

async function getCurationStats(curationId) {
  const total    = await curatedNfts.countAsync({ curationId })
  const withMedia = await curatedNfts.countAsync({ curationId, localPath: { $exists: true } })
  const videos   = await curatedNfts.countAsync({ curationId, mediaType: 'video' })
  return { total, withMedia, videos }
}

module.exports = {
  initDb, getMediaDir, setMediaDir,
  upsertNFTs, patchRawNft, clearRawNfts, queryRawNfts, getDistinctRawValues, getRawNftById, getRawNftCount,
  createCuration, listCurations, getCurationById, deleteCuration,
  upsertCuratedNft, patchCuratedNft, removeCuratedNfts, getCuratedNftIds, getCuratedNfts, getDistinctCuratedValues, getCurationStats,
}

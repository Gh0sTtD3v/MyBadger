const path = require('path')
const fs   = require('fs')

let helia     = null
let heliaFs   = null
let initError = null

async function initIpfs(dataDir) {
  try {
    const { createHelia }   = await import('helia')
    const { unixfs }        = await import('@helia/unixfs')
    const { FsBlockstore }  = await import('blockstore-fs')
    const { FsDatastore }   = await import('datastore-fs')

    const blockstore = new FsBlockstore(path.join(dataDir, 'ipfs', 'blocks'))
    const datastore  = new FsDatastore(path.join(dataDir, 'ipfs', 'data'))

    helia   = await createHelia({ blockstore, datastore })
    heliaFs = unixfs(helia)

    return { ok: true, peerId: helia.libp2p.peerId.toString() }
  } catch (err) {
    initError = err.message
    return { ok: false, error: err.message }
  }
}

async function pinFile(filePath) {
  if (!heliaFs) throw new Error('IPFS node not ready')
  const cid = await heliaFs.addBytes(fs.readFileSync(filePath))
  await helia.pins.add(cid)
  return cid.toString()
}

async function unpinCid(cidStr) {
  if (!helia) throw new Error('IPFS node not ready')
  const { CID } = await import('multiformats/cid')
  await helia.pins.rm(CID.parse(cidStr))
}

async function getStatus() {
  if (!helia) return { running: false, error: initError }
  return {
    running: true,
    peerId:  helia.libp2p.peerId.toString(),
    peers:   helia.libp2p.getPeers().length,
  }
}

async function stopIpfs() {
  if (helia) await helia.stop()
}

module.exports = { initIpfs, pinFile, unpinCid, getStatus, stopIpfs }
'use client'

import { useEffect, useRef, useState } from 'react'
import { useCurations } from '../../context/CurationsContext'

const PAGE_SIZES = [20, 50, 100, 200]
const VIDEO_EXTS = ['.mp4', '.webm', '.ogv', '.mov']

function getMediaType(url) {
  if (!url) return 'image'
  const ext = url.split('?')[0].match(/\.(\w+)$/)?.[1]?.toLowerCase()
  return ext && VIDEO_EXTS.includes('.' + ext) ? 'video' : 'image'
}

const IPFS_GATEWAY = 'https://nftstorage.link/ipfs/'
function normalizeUrl(url) {
  if (!url) return null
  // if (url.startsWith('ipfs://')) return IPFS_GATEWAY + url.slice(7)
  return url
}

export default function Indexer() {
  const { curations, refresh } = useCurations()

  const [activeCuration, setActiveCuration] = useState(null)
  const [newName,         setNewName]        = useState('')
  const [creating,        setCreating]       = useState(false)

  const [rawNfts,    setRawNfts]    = useState([])
  const [total,      setTotal]      = useState(0)
  const [page,       setPage]       = useState(0)
  const [pageSize,   setPageSize]   = useState(50)
  const [search,     setSearch]     = useState('')
  const [chainFilter,  setChainFilter]  = useState('')
  const [walletFilter, setWalletFilter] = useState('')
  const [chains,     setChains]     = useState([])
  const [wallets,    setWallets]    = useState([])
  const [curatedIds, setCuratedIds] = useState(new Set())
  const [checked,    setChecked]    = useState(new Set())
  const [toRemove,   setToRemove]   = useState(new Set())

  const [running,  setRunning]  = useState(false)
  const [progress, setProgress] = useState(null)
  const [logs,     setLogs]     = useState([])
  const logEndRef = useRef(null)

  // Load distinct chain/wallet values for filters
  useEffect(() => {
    if (!activeCuration || !window.electron) return
    window.electron.raw.distinct('chain').then(setChains)
    window.electron.raw.distinct('wallet').then(setWallets)
  }, [activeCuration])

  // Load raw NFTs when curation/page/search/filter changes
  useEffect(() => {
    if (!activeCuration || !window.electron) return
    window.electron.raw.query({ search: search || undefined, chain: chainFilter || undefined, wallet: walletFilter || undefined, limit: pageSize, offset: page * pageSize })
      .then(res => { setRawNfts(res.rows); setTotal(res.total) })
  }, [activeCuration, page, pageSize, search, chainFilter, walletFilter])

  // Load already-curated IDs when curation changes
  useEffect(() => {
    if (!activeCuration || !window.electron) return
    window.electron.curated.ids(activeCuration._id).then(ids => setCuratedIds(new Set(ids)))
    setChecked(new Set())
    setToRemove(new Set())
    setPage(0)
  }, [activeCuration])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  async function createCuration() {
    if (!newName.trim() || !window.electron) return
    const c = await window.electron.curations.create(newName.trim())
    await refresh()
    setActiveCuration(c)
    setNewName('')
    setCreating(false)
  }

  async function deleteCuration() {
    if (!activeCuration || !window.electron) return
    await window.electron.curations.delete(activeCuration._id)
    await refresh()
    setActiveCuration(null)
    setRawNfts([])
    setCuratedIds(new Set())
    setChecked(new Set())
  }

  function toggleCheck(id) {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleRemove(id) {
    setToRemove(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function runRemove() {
    if (!activeCuration || !toRemove.size || !window.electron) return
    await window.electron.curated.remove(activeCuration._id, [...toRemove])
    const ids = await window.electron.curated.ids(activeCuration._id)
    setCuratedIds(new Set(ids))
    setToRemove(new Set())
  }

  function toggleAll() {
    const uncurated = rawNfts.filter(n => !curatedIds.has(n.id)).map(n => n.id)
    const allChecked = uncurated.every(id => checked.has(id))
    setChecked(prev => {
      const next = new Set(prev)
      allChecked ? uncurated.forEach(id => next.delete(id)) : uncurated.forEach(id => next.add(id))
      return next
    })
  }

  async function runCurate() {
    if (!activeCuration || !checked.size || !window.electron) return
    setRunning(true)
    setProgress(null)
    setLogs([])

    window.electron.onEvent((payload) => {
      if (payload.type === 'progress') {
        setProgress({ current: payload.current, total: payload.total })
        setLogs(prev => [...prev, payload.message])
      } else if (payload.type === 'done' || payload.type === 'error') {
        setRunning(false)
        window.electron.removeListeners()
        // Refresh curated IDs
        window.electron.curated.ids(activeCuration._id).then(ids => setCuratedIds(new Set(ids)))
        setChecked(new Set())
        if (payload.type === 'done') setLogs(prev => [...prev, payload.message])
      }
    })

    await window.electron.curate(activeCuration._id, [...checked])
  }

  const totalPages   = Math.ceil(total / pageSize)
  const checkedCount = checked.size
  const removeCount  = toRemove.size

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px', gap: '16px', boxSizing: 'border-box', overflow: 'hidden' }}>
      <h2 style={{ margin: 0, fontSize: '14px', color: '#a3e635' }}>Indexer</h2>

      {/* Curation selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <select
          value={activeCuration?._id ?? ''}
          onChange={e => {
            const c = curations.find(c => c._id === e.target.value) || null
            setActiveCuration(c)
          }}
          style={selectStyle}
        >
          <option value="">— select curation —</option>
          {curations.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>

        {!creating ? (
          <button onClick={() => setCreating(true)} style={ghostBtn}>+ New</button>
        ) : (
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createCuration(); if (e.key === 'Escape') setCreating(false) }}
              placeholder="Curation name"
              style={{ ...inputStyle, width: '160px' }}
            />
            <button onClick={createCuration} style={greenBtn}>Create</button>
            <button onClick={() => setCreating(false)} style={ghostBtn}>Cancel</button>
          </div>
        )}

        {activeCuration && (
          <button onClick={deleteCuration} style={dangerBtn}>Delete</button>
        )}

        <div style={{ flex: 1 }} />

        {activeCuration && (
          <>
            {removeCount > 0 && (
              <button
                onClick={runRemove}
                disabled={running}
                style={{
                  padding: '6px 14px', background: '#3a0a0a',
                  color: '#f87171', border: '1px solid #5a1a1a', borderRadius: '4px',
                  cursor: running ? 'not-allowed' : 'pointer',
                  fontSize: '12px', fontFamily: 'monospace',
                }}
              >
                {`Remove (${removeCount})`}
              </button>
            )}
            <button
              onClick={runCurate}
              disabled={running || !checkedCount}
              style={{
                padding: '6px 14px', background: running ? '#1a3a00' : checkedCount ? '#16a34a' : '#111',
                color: '#fff', border: 'none', borderRadius: '4px',
                cursor: running || !checkedCount ? 'not-allowed' : 'pointer',
                fontSize: '12px', fontFamily: 'monospace',
                opacity: !checkedCount && !running ? 0.4 : 1,
              }}
            >
              {running ? 'Curating...' : `Curate${checkedCount ? ` (${checkedCount})` : ''}`}
            </button>
          </>
        )}
      </div>

      {activeCuration && (
        <>
          {/* Progress bar */}
          {progress && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '11px', color: '#555' }}>{progress.current} / {progress.total}</div>
              <div style={{ height: '3px', background: '#1a1a1a', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(progress.current / progress.total) * 100}%`, background: '#a3e635', transition: 'width 0.15s ease' }} />
              </div>
            </div>
          )}

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <input
              type="text" placeholder="Search..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(0) }}
              style={{ ...inputStyle, width: '160px' }}
            />
            <select value={chainFilter} onChange={e => { setChainFilter(e.target.value); setPage(0) }} style={selectStyle}>
              <option value="">All chains</option>
              {chains.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={walletFilter} onChange={e => { setWalletFilter(e.target.value); setPage(0) }} style={{ ...selectStyle, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <option value="">All wallets</option>
              {wallets.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(0) }} style={selectStyle}>
              {PAGE_SIZES.map(n => <option key={n} value={n}>{n} per page</option>)}
            </select>
            <span style={{ fontSize: '11px', color: '#444', marginLeft: 'auto' }}>{total} NFTs</span>
          </div>

          {/* NFT list */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {/* Select all row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 8px', borderBottom: '1px solid #1a1a1a', marginBottom: '4px' }}>
              <input type="checkbox"
                checked={rawNfts.filter(n => !curatedIds.has(n.id)).every(n => checked.has(n.id)) && rawNfts.some(n => !curatedIds.has(n.id))}
                onChange={toggleAll}
                style={{ accentColor: '#a3e635', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '10px', color: '#444', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Select all on page</span>
            </div>

            {rawNfts.map(nft => {
              const isCurated  = curatedIds.has(nft.id)
              const isChecked  = checked.has(nft.id)
              const isRemoving = toRemove.has(nft.id)
              const thumb      = normalizeUrl(nft.image?.thumbnailUrl || nft.image?.cachedUrl || nft.image?.originalUrl)
              return (
                <div key={nft.id} onClick={() => isCurated ? toggleRemove(nft.id) : toggleCheck(nft.id)} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '6px 8px', borderRadius: '4px',
                  background: isRemoving ? '#1f0a0a' : isChecked ? '#0f1f00' : 'transparent',
                  cursor: 'pointer',
                  opacity: isCurated && !isRemoving ? 0.5 : 1,
                  transition: 'background 0.1s ease',
                }}>
                  <input type="checkbox"
                    checked={isRemoving ? false : isChecked || isCurated}
                    onChange={() => isCurated ? toggleRemove(nft.id) : toggleCheck(nft.id)}
                    onClick={e => e.stopPropagation()}
                    style={{ accentColor: isRemoving ? '#ef4444' : '#a3e635', cursor: 'pointer', flexShrink: 0 }}
                  />
                  {thumb && (getMediaType(thumb) === 'video'
                    ? <video src={thumb} muted style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '3px', flexShrink: 0 }} />
                    : <img   src={thumb} alt="" style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '3px', flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', color: '#d4d4d4', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {nft.name || nft.contract?.name || 'Unnamed'}
                    </div>
                    <div style={{ fontSize: '10px', color: '#444', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {nft.collection?.name || nft.contract?.name || ''}
                    </div>
                  </div>
                  <span style={{ fontSize: '9px', color: '#2a2a2a', flexShrink: 0 }}>{nft.chain}</span>
                  {isCurated && !isRemoving && <span style={{ fontSize: '9px', color: '#1a3a00', background: '#0a200a', padding: '1px 6px', borderRadius: '8px', flexShrink: 0 }}>curated</span>}
                  {isRemoving && <span style={{ fontSize: '9px', color: '#7a1a1a', background: '#1f0a0a', padding: '1px 6px', borderRadius: '8px', flexShrink: 0 }}>remove</span>}
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#555', paddingTop: '8px', borderTop: '1px solid #1a1a1a' }}>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={pageBtn}>prev</button>
              <span>{page + 1} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} style={pageBtn}>next</button>
            </div>
          )}

          {/* Log */}
          {logs.length > 0 && (
            <div style={{ maxHeight: '80px', overflowY: 'auto', fontSize: '10px', color: '#555', lineHeight: '1.6' }}>
              {logs.map((l, i) => <div key={i}>{l}</div>)}
              <div ref={logEndRef} />
            </div>
          )}
        </>
      )}

      {!activeCuration && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2a2a2a', fontSize: '12px' }}>
          Select or create a curation to start
        </div>
      )}
    </div>
  )
}

const inputStyle  = { padding: '6px 10px', background: '#111', border: '1px solid #222', borderRadius: '4px', color: '#e5e5e5', fontSize: '12px', fontFamily: 'monospace', outline: 'none' }
const selectStyle = { padding: '6px 10px', background: '#111', border: '1px solid #222', borderRadius: '4px', color: '#e5e5e5', fontSize: '12px', fontFamily: 'monospace', outline: 'none' }
const ghostBtn    = { padding: '6px 12px', background: 'transparent', border: '1px solid #222', borderRadius: '4px', color: '#555', cursor: 'pointer', fontSize: '12px', fontFamily: 'monospace' }
const greenBtn    = { padding: '6px 12px', background: '#16a34a', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', fontSize: '12px', fontFamily: 'monospace' }
const dangerBtn   = { padding: '6px 12px', background: 'transparent', border: '1px solid #3a1a1a', borderRadius: '4px', color: '#7a3a3a', cursor: 'pointer', fontSize: '12px', fontFamily: 'monospace' }
const pageBtn     = { padding: '3px 10px', background: '#111', border: '1px solid #222', borderRadius: '4px', color: '#555', cursor: 'pointer', fontSize: '11px', fontFamily: 'monospace' }

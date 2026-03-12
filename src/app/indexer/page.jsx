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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px', gap: '14px', boxSizing: 'border-box', overflow: 'hidden' }}>
      <h2 className="page-title">Curate</h2>

      {/* Curation selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <select
          value={activeCuration?._id ?? ''}
          onChange={e => {
            const c = curations.find(c => c._id === e.target.value) || null
            setActiveCuration(c)
          }}
          className="input"
          style={{ fontSize: '13px' }}
        >
          <option value="">— select curation —</option>
          {curations.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>

        {!creating ? (
          <button onClick={() => setCreating(true)} className="btn btn-ghost">+ New</button>
        ) : (
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createCuration(); if (e.key === 'Escape') setCreating(false) }}
              placeholder="Curation name"
              className="input"
              style={{ width: '160px', fontSize: '13px' }}
            />
            <button onClick={createCuration} className="btn btn-primary">Create</button>
            <button onClick={() => setCreating(false)} className="btn btn-ghost">Cancel</button>
          </div>
        )}

        {activeCuration && (
          <button onClick={deleteCuration} className="btn btn-danger">Delete</button>
        )}

        <div style={{ flex: 1 }} />

        {activeCuration && (
          <>
            {removeCount > 0 && (
              <button onClick={runRemove} disabled={running} className="btn btn-danger">
                {`Remove (${removeCount})`}
              </button>
            )}
            <button
              onClick={runCurate}
              disabled={running || !checkedCount}
              className="btn btn-primary"
              style={{ opacity: !checkedCount && !running ? 0.35 : 1 }}
            >
              {running ? 'Curating…' : `Curate${checkedCount ? ` (${checkedCount})` : ''}`}
            </button>
          </>
        )}
      </div>

      {activeCuration && (
        <>
          {/* Progress bar */}
          {progress && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>{progress.current} / {progress.total}</div>
              <div style={{ height: '2px', background: 'var(--bg-3)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(progress.current / progress.total) * 100}%`, background: 'var(--accent)', transition: 'width 0.15s ease' }} />
              </div>
            </div>
          )}

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="text" placeholder="Search…" value={search}
              onChange={e => { setSearch(e.target.value); setPage(0) }}
              className="input"
              style={{ width: '150px', fontSize: '13px' }}
            />
            <select value={chainFilter} onChange={e => { setChainFilter(e.target.value); setPage(0) }} className="input" style={{ fontSize: '13px' }}>
              <option value="">All chains</option>
              {chains.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={walletFilter} onChange={e => { setWalletFilter(e.target.value); setPage(0) }} className="input" style={{ maxWidth: '150px', fontSize: '13px' }}>
              <option value="">All wallets</option>
              {wallets.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(0) }} className="input" style={{ fontSize: '13px' }}>
              {PAGE_SIZES.map(n => <option key={n} value={n}>{n} per page</option>)}
            </select>
            <span style={{ fontSize: '12px', color: 'var(--text-3)', marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>{total} NFTs</span>
          </div>

          {/* NFT list */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {/* Select all row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>
              <input type="checkbox"
                checked={rawNfts.filter(n => !curatedIds.has(n.id)).every(n => checked.has(n.id)) && rawNfts.some(n => !curatedIds.has(n.id))}
                onChange={toggleAll}
                style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
              />
              <span className="section-label">Select all on page</span>
            </div>

            {rawNfts.map(nft => {
              const isCurated  = curatedIds.has(nft.id)
              const isChecked  = checked.has(nft.id)
              const isRemoving = toRemove.has(nft.id)
              const thumb      = normalizeUrl(nft.image?.thumbnailUrl || nft.image?.cachedUrl || nft.image?.originalUrl)
              return (
                <div key={nft.id} onClick={() => isCurated ? toggleRemove(nft.id) : toggleCheck(nft.id)} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '8px 10px', borderRadius: 'var(--r2)',
                  background: isRemoving ? 'var(--red-bg)' : isChecked ? 'var(--accent-xlo)' : 'transparent',
                  cursor: 'pointer',
                  opacity: isCurated && !isRemoving ? 0.45 : 1,
                  transition: 'background var(--ease)',
                  borderLeft: isChecked ? '2px solid var(--accent-bdr)' : isRemoving ? '2px solid var(--red-bdr)' : '2px solid transparent',
                }}>
                  <input type="checkbox"
                    checked={isRemoving ? false : isChecked || isCurated}
                    onChange={() => isCurated ? toggleRemove(nft.id) : toggleCheck(nft.id)}
                    onClick={e => e.stopPropagation()}
                    style={{ accentColor: isRemoving ? 'var(--red)' : 'var(--accent)', cursor: 'pointer', flexShrink: 0 }}
                  />
                  {thumb && (getMediaType(thumb) === 'video'
                    ? <video src={thumb} muted style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: 'var(--r2)', flexShrink: 0 }} />
                    : <img   src={thumb} alt="" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: 'var(--r2)', flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {nft.name || nft.contract?.name || 'Unnamed'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                      {nft.collection?.name || nft.contract?.name || ''}
                    </div>
                  </div>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '9px', fontWeight: 600, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.1em', flexShrink: 0 }}>{nft.chain}</span>
                  {isCurated && !isRemoving && <span className="badge badge-green" style={{ flexShrink: 0 }}>curated</span>}
                  {isRemoving && <span className="badge badge-red" style={{ flexShrink: 0 }}>remove</span>}
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: 'var(--text-3)', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="btn btn-ghost" style={{ padding: '4px 14px', fontSize: '13px' }}>prev</button>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{page + 1} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="btn btn-ghost" style={{ padding: '4px 14px', fontSize: '13px' }}>next</button>
            </div>
          )}

          {/* Log */}
          {logs.length > 0 && (
            <div style={{ maxHeight: '80px', overflowY: 'auto', fontSize: '11px', color: 'var(--text-3)', lineHeight: '1.7', fontFamily: 'var(--font-mono)', background: 'var(--bg-1)', borderRadius: 'var(--r1)', padding: '8px 12px' }}>
              {logs.map((l, i) => <div key={i}>{l}</div>)}
              <div ref={logEndRef} />
            </div>
          )}
        </>
      )}

      {!activeCuration && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-4)' }}>
          <span className="section-label">Select or create a curation to start</span>
        </div>
      )}
    </div>
  )
}

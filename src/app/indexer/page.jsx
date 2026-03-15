'use client'

import { useEffect, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useCurations } from '../../context/CurationsContext'
import { SmallViewIcon, LargeViewIcon, DetailViewIcon } from '../../components/ui/icons'

const PAGE_SIZES = [20, 50, 100, 200, 500]
const VIDEO_EXTS = ['.mp4', '.webm', '.ogv', '.mov']

function getMediaType(url) {
  if (!url) return 'image'
  const ext = url.split('?')[0].match(/\.(\w+)$/)?.[1]?.toLowerCase()
  return ext && VIDEO_EXTS.includes('.' + ext) ? 'video' : 'image'
}

const IPFS_GATEWAY = 'https://nftstorage.link/ipfs/'
function normalizeUrl(url) {
  if (!url) return null
  if (url.startsWith('ipfs://')) return IPFS_GATEWAY + url.slice(7)
  return url
}

const CHAIN_META = {
  eth:      { color: '#627EEA', name: 'Ethereum' },
  polygon:  { color: '#8247E5', name: 'Polygon' },
  arb:      { color: '#28A0F0', name: 'Arbitrum' },
  opt:      { color: '#FF0420', name: 'Optimism' },
  base:     { color: '#0052FF', name: 'Base' },
  zora:     { color: '#A36EFD', name: 'Zora' },
  btc:      { color: '#F7931A', name: 'Bitcoin' },
  xcp:      { color: '#F7931A', name: 'Bitcoin' },
  solana:   { color: '#9945FF', name: 'Solana' },
  tezos:    { color: '#2C7DF7', name: 'Tezos' },
  xrpl:     { color: '#F7931A', name: 'Bitcoin' },
}

function ChainIcon({ chain }) {
  const key   = chain?.toLowerCase()
  const color = (CHAIN_META[key]?.color || '').toLowerCase()
  return (
    <div className={`flex items-center gap-1 pl-1 pr-2 py-1 rounded-md w-min border-1 border-[var(--border)] text-[${color}] border-gray-500`}>
      <ChainSvg chain={key} color={color} />
      <span 
        // style={{ fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 600, color: 'var(--text-4)', textTransform: 'uppercase' }}
        className={`font-display font-semibold text-[12px] text-[${color}]`}
      >{CHAIN_META[key]?.name || chain}</span>
    </div>
  )
}

function ChainSvg({ chain, color }) {
  const p = { width: 20, height: 20, viewBox: '0 0 16 16', fill: 'none', style: { flexShrink: 0, display: 'block' } }
  switch (chain) {
    case 'eth':
      return <svg {...p}><path d="M8 1.5L14 8.5L8 10.5L2 8.5Z" fill={color} fillOpacity="0.9"/><path d="M8 10.5L14 8.5L8 14.5L2 8.5Z" fill={color} fillOpacity="0.5"/></svg>
    case 'polygon':
      return <svg {...p}><path d="M10.5 5.5L8 4L5.5 5.5V8.5L8 10L10.5 8.5V5.5Z" stroke={color} strokeWidth="1.3" fill={color} fillOpacity="0.18" strokeLinejoin="round"/><path d="M10.5 5.5L13 4V9L10.5 10.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M5.5 5.5L3 4V9L5.5 10.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
    case 'btc': case 'xcp':
      return <svg {...p}><path d="M5.5 3H9.5C10.6 3 11.5 3.9 11.5 5S10.6 7 9.5 7H5.5" stroke={color} strokeWidth="1.4" strokeLinecap="round"/><path d="M5.5 7H10C11.1 7 12 7.9 12 9S11.1 11 10 11H5.5" stroke={color} strokeWidth="1.4" strokeLinecap="round"/><path d="M5.5 3V11" stroke={color} strokeWidth="1.4" strokeLinecap="round"/><path d="M7.5 1.5V3M7.5 11V12.5" stroke={color} strokeWidth="1.3" strokeLinecap="round"/></svg>
    case 'solana':
      return <svg {...p}><path d="M3 5H11L13 3H5Z" fill={color}/><path d="M3 8.5H11L13 6.5H5Z" fill={color}/><path d="M3 12H11L13 10H5Z" fill={color}/></svg>
    case 'tezos':
      return <svg {...p}><path d="M4 4H12M8 4V12" stroke={color} strokeWidth="1.5" strokeLinecap="round"/><path d="M5.5 8H10.5" stroke={color} strokeWidth="1.3" strokeLinecap="round"/></svg>
    case 'xrpl':
      return <svg {...p}><path d="M3 3L7 8L3 13M13 3L9 8L13 13" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
    case 'arb':
      return <svg {...p}><path d="M8 2L14 13H2L8 2Z" stroke={color} strokeWidth="1.4" fill={color} fillOpacity="0.12" strokeLinejoin="round"/><path d="M6.5 9.5L8 7L9.5 9.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
    case 'opt':
      return <svg {...p}><circle cx="8" cy="8" r="5.5" stroke={color} strokeWidth="1.4"/><circle cx="8" cy="8" r="2.5" fill={color} fillOpacity="0.75"/></svg>
    case 'base':
      return <svg {...p}><circle cx="8" cy="8" r="5.5" stroke={color} strokeWidth="1.4"/><path d="M6 5.5H9C10.1 5.5 11 6.4 11 7.5V8.5C11 9.6 10.1 10.5 9 10.5H6V5.5Z" fill={color} fillOpacity="0.8"/></svg>
    case 'zora':
      return <svg {...p}><circle cx="8" cy="8" r="5.5" stroke={color} strokeWidth="1.4"/><circle cx="8" cy="8" r="2" stroke={color} strokeWidth="1.2"/></svg>
    default:
      return <svg {...p}><circle cx="8" cy="8" r="5.5" stroke="var(--text-4)" strokeWidth="1.3" strokeDasharray="2 2"/></svg>
  }
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
  const [contractFilter, setContractFilter] = useState('')
  const [curationFilter, setCurationFilter] = useState('')
  const [chains,     setChains]     = useState([])
  const [wallets,    setWallets]    = useState([])
  const [contracts,  setContracts]  = useState([])
  const [curatedIds, setCuratedIds] = useState(new Set())
  const [checked,    setChecked]    = useState(new Set())
  const [toRemove,   setToRemove]   = useState(new Set())

  const [running,  setRunning]  = useState(false)
  const [progress, setProgress] = useState(null)
  const [logs,     setLogs]     = useState([])
  const logEndRef = useRef(null)
  const listRef   = useRef(null)

  const [view, setView] = useState(() => 'detail' )// localStorage.getItem('curateView') || 'detail')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  // Persist view
  useEffect(() => { 
    localStorage.setItem('curateView', view)
  }, [view])

  // Restore last-selected curation from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('activeCurationId')
    if (saved && curations.length) {
      const c = curations.find(c => c._id === saved)
      if (c) setActiveCuration(c)
    }
  }, [curations])

  // Persist selected curation
  useEffect(() => {
    if (activeCuration) localStorage.setItem('activeCurationId', activeCuration._id)
    else localStorage.removeItem('activeCurationId')
  }, [activeCuration])

  // Load distinct chain/wallet values for filters
  useEffect(() => {
    if (!activeCuration || !window.electron) return
    window.electron.raw.distinct('chain').then(setChains)
    window.electron.raw.distinct('wallet').then(setWallets)
    window.electron.raw.distinct('contract.address').then(setContracts)
  }, [activeCuration])

  // Load raw NFTs when curation/page/search/filter changes
  useEffect(() => {
    if (!activeCuration || !window.electron) return
    window.electron.raw.query({ search: search || undefined, chain: chainFilter || undefined, wallet: walletFilter || undefined, contract: contractFilter || undefined, limit: pageSize, offset: page * pageSize })
      .then(res => { setRawNfts(res.rows); setTotal(res.total) })
  }, [activeCuration, page, pageSize, search, chainFilter, walletFilter, contractFilter])

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
    if (!activeCuration || !window.electron) {
      setConfirmingDelete(false)
      return
    }

    if (!confirmingDelete) {
      setConfirmingDelete(true)
      return
    }
  }

  async function confirmedDeleteCuration() {
    if (!activeCuration || !window.electron) {
      setConfirmingDelete(false)
      return
    }
    await window.electron.curations.delete(activeCuration._id)
    await refresh()
    setActiveCuration(null)
    setRawNfts([])
    setCuratedIds(new Set())
    setChecked(new Set())
    setConfirmingDelete(false)
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

  const virtualizer = useVirtualizer({
    count: rawNfts.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => view === 'detail' ? 200 : view === 'large' ? 80 : 56,
    overscan: 5,
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px', gap: '14px', boxSizing: 'border-box', overflow: 'hidden' }}>
      <h2 className="page-title">Curate</h2>
      
      {/* Curation selector */}
      <div className="flex items-start flex-col w-full gap-2">
        <h3 className="section-label">
          Collectionw
        </h3>
        <div className="flex items-center flex-1 justify-between w-full">
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={activeCuration?._id ?? ''}
              onChange={e => {
                const c = curations.find(c => c._id === e.target.value) || null
                setActiveCuration(c)
              }}
              disabled={running}
              className="input"
              style={{ fontSize: '13px' }}
            >
              <option value="">— select curation —</option>
              {curations.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>

            {!creating ? (
              <button onClick={() => setCreating(true)} disabled={running} className="btn btn-ghost">+ New</button>
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
              <button onClick={deleteCuration} disabled={running} className="btn btn-danger">Delete</button>
            )}
          </div>

          {activeCuration && (
            <div className="flex items-center gap-2 flex-0">
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
            </div>
          )}
        </div>
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
          <div className="flex items-center justify-between flex-wrap">
            <div className="flex items-center gap-2">
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
              <select value={contractFilter} onChange={e => { setContractFilter(e.target.value); setPage(0) }} className="input" style={{ maxWidth: '150px', fontSize: '13px' }}>
                <option value="">All contracts</option>
                {contracts.map(c => <option key={c} value={c}>{c.slice(0, 6)}…{c.slice(-4)}</option>)}
              </select>
              {/* <select value={curationFilter} onChange={e => { setCurationFilter(e.target.value); setPage(0) }} className="input" style={{ maxWidth: '150px', fontSize: '13px' }}>
                <option value="">Include all</option>
                <option value="included">Curated</option>
                <option value="excluded">Not Curated</option>
              </select> */}
            </div>

            <div className="flex items-center gap-4">
              <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(0) }} className="input" style={{ fontSize: '13px' }}>
                {PAGE_SIZES.map(n => <option key={n} value={n}>{n} per page</option>)}
              </select>
              <span style={{ fontSize: '12px', color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>{total} NFTs</span>

              {/* View toggle */}
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--r1)', padding: '2px', gap: '1px' }}>
                {[
                  { id: 'small',  icon: <SmallViewIcon /> },
                  { id: 'large',  icon: <LargeViewIcon /> },
                  { id: 'detail', icon: <DetailViewIcon /> },
                ].map(({ id, icon }) => (
                  <button key={id} onClick={() => setView(id)} title={id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '26px', height: '22px', borderRadius: '3px', border: 'none',
                    background: view === id ? 'var(--bg-3)' : 'transparent',
                    color: view === id ? 'var(--accent)' : 'var(--text-4)',
                    cursor: 'pointer',
                    transition: 'background var(--ease), color var(--ease)',
                  }}>
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* NFT list */}
          <div className="flex-1 overflow-y-auto" style={{ display: 'flex', flexDirection: 'column' }} ref={listRef}>
            {/* Select all row */}
            <div className="flex items-center gap-2.5 px-3 py-2 mb-1" style={{ borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <input
                type="checkbox"
                checked={rawNfts.filter(n => !curatedIds.has(n.id)).every(n => checked.has(n.id)) && rawNfts.some(n => !curatedIds.has(n.id))}
                onChange={toggleAll}
                style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
              />
              <span className="section-label">Select all on page</span>
            </div>

            <div style={{ height: virtualizer.getTotalSize(), position: 'relative', flexShrink: 0 }}>
            {virtualizer.getVirtualItems().map(virtualRow => {
              const nft = rawNfts[virtualRow.index]
              const isCurated  = curatedIds.has(nft.id)
              const isChecked  = checked.has(nft.id)
              const isRemoving = toRemove.has(nft.id)
              const thumb      = normalizeUrl(nft.image?.thumbnailUrl || nft.image?.cachedUrl || nft.image?.originalUrl)
              const imgSize    = view === 'small' ? 160 : 320
              const sourceUrl = nft.video?.originalUrl || nft.audio?.originalUrl || nft.image?.originalUrl || ""
              const sourceType = (sourceUrl.includes("ipfs://") || sourceUrl.includes("nftstorage.link/ipfs/") || sourceUrl.includes("ipfs.io/ipfs/")) ? 'ipfs' 
                : ((sourceUrl.includes("arweave.net/") || sourceUrl.includes("ar://")) ? 'arweave' : 'http')

              // Row background & left-border state
              const rowBg = isRemoving
                ? 'var(--red-bg)'
                : isChecked
                  ? 'var(--accent-xlo)'
                  : isCurated
                    ? 'var(--accent-xlo)' // 21% opacity
                    : 'transparent'
              const leftBorder = isChecked
                ? '2px solid var(--accent-bdr)'
                : isRemoving
                  ? '2px solid var(--red-bdr)'
                  : '2px solid transparent'

              return (
                  <div
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${virtualRow.start}px)`, paddingBottom: '2px' }}
                  >
                  <div
                    onClick={() => isCurated ? toggleRemove(nft.id) : toggleCheck(nft.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '14px',
                      padding: '10px 12px',
                      borderRadius: 'var(--r2)',
                      background: rowBg,
                      borderLeft: leftBorder,
                      cursor: isCurated && !isRemoving ? 'default' : 'pointer',
                      opacity: isCurated ? (!isRemoving ? 0.75 : 1) : .69,
                      transition: 'background var(--ease)',
                    }}
                  >
                    {/* Checkbox */}
                    <div className="flex items-center pt-0.5 flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={isRemoving ? false : isChecked || isCurated}
                        onChange={() => isCurated ? toggleRemove(nft.id) : toggleCheck(nft.id)}
                        onClick={e => e.stopPropagation()}
                        style={{ accentColor: isRemoving ? 'var(--red)' : 'var(--accent)', cursor: 'pointer' }}
                      />
                    </div>

                    {/* Thumbnail */}
                    {thumb && (
                      getMediaType(thumb) === 'video'
                        ? <video src={thumb} muted 
                            style={{ width: imgSize, height: imgSize, objectFit: 'contain', borderRadius: 'var(--r2)', flexShrink: 0 }} 
                            // className={`w-[${imgSize}px] h-[${imgSize}px] max-w-[${imgSize}px] max-h-[${imgSize}px] object-fit rounded-[var(--r2)] flex-shrink-0 ${isRemoving ? 'opacity-50' : ''}`}
                          />
                        : <img src={thumb} alt="" loading="lazy"
                            style={{ width: imgSize, height: imgSize, objectFit: 'contain', borderRadius: 'var(--r2)', flexShrink: 0 }}
                            // className={`w-[${imgSize}px] h-[${imgSize}px] max-w-[${imgSize}px] max-h-[${imgSize}px] object-fit rounded-[var(--r2)] flex-shrink-0 ${isRemoving ? 'opacity-50' : ''}`}
                          />
                    )}
                    {!thumb && (
                      <div style={{ width: imgSize, height: imgSize, borderRadius: 'var(--r2)', flexShrink: 0, background: 'var(--bg-2)', border: '1px solid var(--border)' }} />
                    )}

                    {/* Text content */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between h-full overflow-hidden py-1" style={{ gap: '6px' }}>
                      {/* Details */}
                      <div className="flex flex-col gap-2">
                        {view === 'detail' && <h2 className="section-label w-full text-left">Metadata</h2>}
                        <div className="flex items-center gap-2">
                          {/* Name + collection */}
                          <div className="flex flex-col gap-1">
                            <div 
                              style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'var(--font-ui)' }}
                            >
                              {/* <span className="">Title:</span>&nbsp; */}
                              <span>{nft.name || nft.contract?.name || 'Unnamed'}</span>
                            </div>
                            {nft.tokenId && (<>
                              <div className="flex items-baseline" style={{ gap: '5px' }}>
                                <span style={{ fontSize: '13px', color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>Token</span>
                                <span style={{ fontSize: '13px', color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>#{nft.tokenId}</span>
                              </div>
                            </>)}
                            {(nft.collection?.name || nft.contract?.name) && (
                              <div style={{ fontSize: '11px', color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'var(--font-ui)' }}>
                                {nft.collection?.name || nft.contract?.name}
                              </div>
                            )}
                          </div>
                        </div>
                        {view === 'detail' && <h2 className="section-label w-full text-left text-md">Storage</h2>}
                        <div className="flex items-center gap-2 flex-wrap">
                          {nft.image?.originalUrl && (
                            <div className="flex gap-1 items-center justify-center">
                              <div className="flex items-center gap-2 justify-center">
                                {sourceType === 'ipfs' && (
                                  <div className="flex items-center justify-center border-1 text-cyan-300 border-current text-xs font-bold pb-1 px-2 min-w-4 rounded-xl text-bold font-we">
                                    ipfs
                                  </div>
                                )}
                                {sourceType === 'arweave' && (
                                  <div className="flex items-center justify-center bg-white text-black text-xs font-bold pb-1 px-2 min-w-4 rounded-xl text-2xl text-bold font-we">
                                    a
                                  </div>
                                )}
                                {sourceType === 'http' && (
                                  <div className="flex items-center justify-center bg-red-600/69 text-white text-xs font-bold pb-1 px-2 min-w-4 rounded-xl text-bold font-we">
                                    http
                                  </div>
                                )}
                                <div className="font-mono text-[11px] text-[var(--text-2)] hover:underline cursor-pointer decoration-dotted whitespace-nowrap" title={nft.image.originalUrl}>
                                  {nft.image.originalUrl}
                                  {/* {nft.image.originalUrl.length > 56 ? nft.image.originalUrl.slice(0, 56) + '…' : nft.image.originalUrl} */}
                                  {/* {nft.image.originalUrl.length > 30 ? nft.image.originalUrl.slice(0, 15) + '…' + nft.image.originalUrl.slice(-15) : nft.image.originalUrl} */}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Metadata row */}
                      {view === 'detail' ? (
                        <div className="flex flex-col gap-2">
                          <h2 className="section-label w-full text-left">Chain</h2>
                          <div className="flex flex-col justify-between items-start flex-wrap flex-1 gap-2">
                            {nft.contract?.address && (
                              <div className="flex items-baseline" style={{ gap: '5px' }}>
                                <span className="section-label">Contract: </span>
                                <span style={{ fontSize: '11px', color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
                                  {nft.contract.address}
                                </span>
                              </div>
                            )}
                            {nft.wallet && (
                              <div className="flex items-baseline" style={{ gap: '5px' }}>
                                <span className="section-label">Owner: </span>
                                <span style={{ fontSize: '11px', color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
                                  {nft.wallet}
                                </span>
                              </div>
                            )}
                            {nft.chain && (
                              <div className="relative" style={{ gap: '5px' }}>
                                <ChainIcon chain={nft.chain} />
                              </div>
                            )}
                          </div>
                        </div>
                      ) : <>
                        {nft.chain && (
                          <div className="relative" style={{ gap: '5px' }}>
                            <ChainIcon chain={nft.chain} />
                          </div>
                        )} 
                      </>}
                    </div>

                    <div className="relative flex flex-col justify-between h-full items-end flex-wrap flex-0 gap-2">
                      <div className="absolute -top-1 right-0 flex flex-col justify-between h-full items-end flex-wrap gap-2 p-1">
                        {/* Badges */}
                        <div className="flex items-center" style={{ gap: '4px', marginTop: '1px' }}>
                          {nft.cid       && <span className="badge badge-green">pinned</span>}
                          {nft.localPath && <span className="badge badge-blue">downloaded</span>}
                          {/* {isCurated && !isRemoving && <span className="badge badge-green">curated</span>} */}
                        </div>
                        {isRemoving && (<>
                          {/* <div className="flex items-center gap-1 px-2 py-0.5 text-[var(--red)]">
                            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                              <line x1="1" y1="1" x2="13" y2="13"/>
                              <line x1="1" y1="13" x2="13" y2="1"/>
                            </svg>
                          </div> */}
                        </>)}
                        {isChecked && !isCurated && (<>
                          {/* <div className="flex items-center gap-1 px-2 py-0.5 rounded-md w-min h-9 text-[var(--accent)]">
                            <svg width="13" height="10" viewBox="0 0 14 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 5.5L5 9.5L13 1.5"/>
                            </svg>
                          </div> */}
                        </>)}
                      </div>
                    </div>
                  </div>
                  </div>
                )})}
            </div>
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

      {/* confirming delete */}
      {confirmingDelete && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', zIndex: 10 }}>
          <div style={{ background: 'var(--bg)', padding: '24px', borderRadius: 'var(--r2)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '16px', color: 'var(--text)' }}>Are you sure you want to delete this curation?</span>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={confirmedDeleteCuration} className="btn btn-danger">Yes, delete</button>
              <button onClick={() => setConfirmingDelete(false)} className="btn btn-ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// function SmallViewIcon() {
//   return (
//     <svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor">
//       <rect x="1" y="1" width="5" height="5" rx="0.8"/>
//       <rect x="8" y="1" width="5" height="5" rx="0.8"/>
//       <rect x="1" y="8" width="5" height="5" rx="0.8"/>
//       <rect x="8" y="8" width="5" height="5" rx="0.8"/>
//     </svg>
//   )
// }

// function LargeViewIcon() {
//   return (
//     <svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor">
//       <rect x="1" y="1" width="5.5" height="12" rx="0.8"/>
//       <rect x="7.5" y="1" width="5.5" height="12" rx="0.8"/>
//     </svg>
//   )
// }

// function DetailViewIcon() {
//   return (
//     <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
//       <rect x="1" y="2.5" width="4" height="4" rx="0.6" fill="currentColor" stroke="none"/>
//       <line x1="7" y1="3.5" x2="13" y2="3.5"/>
//       <line x1="7" y1="5.5" x2="11" y2="5.5"/>
//       <rect x="1" y="8.5" width="4" height="4" rx="0.6" fill="currentColor" stroke="none"/>
//       <line x1="7" y1="9.5" x2="13" y2="9.5"/>
//       <line x1="7" y1="11.5" x2="11" y2="11.5"/>
//     </svg>
//   )
// }

'use client'

import { useEffect, useState } from 'react'

function getSource(nft) {
  const url = nft.animation?.originalUrl || nft.image?.originalUrl || ''
  if (/ipfs|nftstorage|dweb\.link/i.test(url)) return 'ipfs'
  if (/arweave\.net/i.test(url))               return 'arweave'
  return 'http'
}

const SOURCE_COLORS = {
  ipfs:    { color: '#a3e635', bg: '#1a2a00' },
  arweave: { color: '#60a5fa', bg: '#001a2a' },
  http:    { color: '#555',    bg: '#111'    },
}

const FILTERS  = ['all', 'ipfs', 'arweave', 'http', 'pinned', 'unpinned']
const PAGE_SIZE = 200

export default function IpfsPage() {
  const [nfts,         setNfts]         = useState([])
  const [total,        setTotal]        = useState(0)
  const [page,         setPage]         = useState(0)
  const [chains,       setChains]       = useState([])
  const [wallets,      setWallets]      = useState([])
  const [chainFilter,  setChainFilter]  = useState('')
  const [walletFilter, setWalletFilter] = useState('')
  const [search,       setSearch]       = useState('')
  const [ipfsStatus,   setIpfsStatus]   = useState(null)
  const [filter,       setFilter]       = useState('all')
  const [selected,     setSelected]     = useState(new Set())
  const [pinning,      setPinning]      = useState(false)
  const [unpinning,    setUnpinning]    = useState(false)
  const [logs,         setLogs]         = useState([])

  useEffect(() => {
    if (!window.electron) return
    window.electron.ipfs.status().then(setIpfsStatus)
    window.electron.raw.distinct('chain').then(setChains)
    window.electron.raw.distinct('wallet').then(setWallets)
  }, [])

  useEffect(() => {
    if (!window.electron) return
    window.electron.raw.query({
      search: search || undefined,
      chain:  chainFilter  || undefined,
      wallet: walletFilter || undefined,
      limit:  PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }).then(res => { setNfts(res.rows); setTotal(res.total) })
  }, [page, search, chainFilter, walletFilter])

  const filtered = nfts.filter(n => {
    if (filter === 'all')      return true
    if (filter === 'pinned')   return !!n.cid
    if (filter === 'unpinned') return !n.cid
    return getSource(n) === filter
  })

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAllIpfs() {
    const ids = filtered.filter(n => getSource(n) === 'ipfs' && !n.cid).map(n => n.id)
    setSelected(new Set(ids))
  }

  async function pinSelected() {
    if (!selected.size || !window.electron) return
    setPinning(true)
    const toPin = filtered.filter(n => selected.has(n.id))

    for (const nft of toPin) {
      const url = nft.animation?.originalUrl || nft.image?.originalUrl
      if (!url) {
        setLogs(prev => [...prev, `skip ${nft.name} — no URL`])
        continue
      }
      setLogs(prev => [...prev, `pinning ${nft.name || nft.id}...`])
      const res = await window.electron.ipfs.pinUrl(nft.id, url)
      if (res?.cid) {
        setNfts(prev => prev.map(n => n.id === nft.id ? { ...n, cid: res.cid } : n))
        setLogs(prev => [...prev, `  ✓ ${res.cid}`])
      } else {
        setLogs(prev => [...prev, `  ✗ ${res?.error || 'failed'}`])
      }
    }

    setSelected(new Set())
    setPinning(false)
  }

  async function unpinSelected() {
    if (!selected.size || !window.electron) return
    setUnpinning(true)
    const toUnpin = filtered.filter(n => selected.has(n.id) && n.cid)

    for (const nft of toUnpin) {
      setLogs(prev => [...prev, `unpinning ${nft.name || nft.id}...`])
      const res = await window.electron.ipfs.unpin(nft.id, nft.cid)
      if (res?.ok) {
        setNfts(prev => prev.map(n => n.id === nft.id ? { ...n, cid: null } : n))
        setLogs(prev => [...prev, `  ✓ unpinned`])
      } else {
        setLogs(prev => [...prev, `  ✗ ${res?.error || 'failed'}`])
      }
    }

    setSelected(new Set())
    setUnpinning(false)
  }

  const canPin     = !pinning && !unpinning && selected.size > 0 && ipfsStatus?.running
  const canUnpin   = !pinning && !unpinning && filtered.some(n => selected.has(n.id) && n.cid) && ipfsStatus?.running
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px', gap: '16px', boxSizing: 'border-box', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <h2 style={{ margin: 0, fontSize: '14px', color: '#a3e635' }}>IPFS</h2>
        <div style={{ flex: 1 }} />
        {ipfsStatus && (
          <span style={{ fontSize: '10px', fontFamily: 'monospace', color: ipfsStatus.running ? '#a3e635' : '#7a3a3a' }}>
            {ipfsStatus.running ? `● node running · ${ipfsStatus.peers} peers` : '● node offline'}
          </span>
        )}
      </div>

      {/* Source filter pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '3px 10px', background: filter === f ? '#1a3a00' : '#111',
            border: `1px solid ${filter === f ? '#4a7a10' : '#222'}`, borderRadius: '12px',
            color: filter === f ? '#a3e635' : '#555', fontSize: '10px', fontFamily: 'monospace', cursor: 'pointer',
          }}>{f}</button>
        ))}
      </div>

      {/* Chain / wallet / search + actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <select value={chainFilter} onChange={e => { setChainFilter(e.target.value); setPage(0) }} style={selectStyle}>
          <option value="">All chains</option>
          {chains.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={walletFilter} onChange={e => { setWalletFilter(e.target.value); setPage(0) }} style={{ ...selectStyle, maxWidth: '140px' }}>
          <option value="">All wallets</option>
          {wallets.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
        <input
          type="text" placeholder="Search..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(0) }}
          style={{ ...selectStyle, width: '140px' }}
        />
        <div style={{ flex: 1 }} />
        {selected.size > 0 && (
          <button onClick={() => setSelected(new Set())} style={ghostBtn}>Deselect all</button>
        )}
        <button onClick={selectAllIpfs} style={ghostBtn}>Select IPFS</button>
        {canUnpin && (
          <button
            onClick={unpinSelected}
            disabled={!canUnpin}
            style={{
              padding: '6px 14px', background: '#3a0a0a',
              color: '#f87171', border: '1px solid #5a1a1a', borderRadius: '4px',
              cursor: 'pointer', fontSize: '12px', fontFamily: 'monospace',
            }}
          >
            {unpinning ? 'Unpinning...' : 'Unpin'}
          </button>
        )}
        <button
          onClick={pinSelected}
          disabled={!canPin}
          style={{
            padding: '6px 14px', background: canPin ? '#16a34a' : '#111',
            color: '#fff', border: 'none', borderRadius: '4px',
            cursor: canPin ? 'pointer' : 'not-allowed',
            fontSize: '12px', fontFamily: 'monospace',
            opacity: canPin ? 1 : 0.4,
          }}
        >
          {pinning ? 'Pinning...' : `Pin${selected.size ? ` (${selected.size})` : ''}`}
        </button>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {filtered.map(nft => {
          const source     = getSource(nft)
          const sc         = SOURCE_COLORS[source]
          const isSelected = selected.has(nft.id)
          const thumb      = nft.image?.thumbnailUrl || nft.image?.cachedUrl
          return (
            <div key={nft.id} onClick={() => toggleSelect(nft.id)} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '6px 8px', borderRadius: '4px', cursor: 'pointer',
              background: isSelected ? '#0f1f00' : 'transparent',
              transition: 'background 0.1s',
            }}>
              <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(nft.id)}
                onClick={e => e.stopPropagation()}
                style={{ accentColor: '#a3e635', cursor: 'pointer', flexShrink: 0 }} />

              {thumb && (
                <img src={thumb} alt=""
                  style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '3px', flexShrink: 0 }}
                  onError={e => { e.target.style.display = 'none' }} />
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', color: '#d4d4d4', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {nft.name || nft.contract?.name || 'Unnamed'}
                </div>
                {nft.cid && (
                  <div style={{ fontSize: '9px', color: '#2a4a10', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {nft.cid}
                  </div>
                )}
              </div>

              <span style={{ fontSize: '9px', color: '#2a2a2a', flexShrink: 0 }}>{nft.chain}</span>
              <span style={{ fontSize: '9px', color: sc.color, background: sc.bg, padding: '1px 6px', borderRadius: '8px', flexShrink: 0 }}>
                {source}
              </span>
              {nft.cid && (
                <span style={{ fontSize: '9px', color: '#a3e635', background: '#1a3a00', padding: '1px 6px', borderRadius: '8px', flexShrink: 0 }}>
                  pinned
                </span>
              )}
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
        <div style={{ maxHeight: '80px', overflowY: 'auto', fontSize: '10px', color: '#555', lineHeight: '1.6', fontFamily: 'monospace' }}>
          {logs.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}
    </div>
  )
}

const selectStyle = { padding: '6px 10px', background: '#111', border: '1px solid #222', borderRadius: '4px', color: '#e5e5e5', fontSize: '12px', fontFamily: 'monospace', outline: 'none' }
const ghostBtn    = { padding: '6px 12px', background: 'transparent', border: '1px solid #222', borderRadius: '4px', color: '#555', cursor: 'pointer', fontSize: '11px', fontFamily: 'monospace' }
const pageBtn     = { padding: '3px 10px', background: '#111', border: '1px solid #222', borderRadius: '4px', color: '#555', cursor: 'pointer', fontSize: '11px', fontFamily: 'monospace' }

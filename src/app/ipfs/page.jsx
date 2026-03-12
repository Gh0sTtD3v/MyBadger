'use client'

import { useEffect, useState } from 'react'

function getSource(nft) {
  const url = nft.animation?.originalUrl || nft.image?.originalUrl || ''
  if (/ipfs|nftstorage|dweb\.link/i.test(url)) return 'ipfs'
  if (/arweave\.net/i.test(url))               return 'arweave'
  return 'http'
}

const SOURCE_COLORS = {
  ipfs:    { color: 'var(--accent)',  bg: 'var(--green-bg)' },
  arweave: { color: 'var(--blue)',    bg: 'var(--blue-bg)'  },
  http:    { color: 'var(--text-3)',  bg: 'var(--bg-2)'     },
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
        <h2 className="page-title">IPFS</h2>
        <div style={{ flex: 1 }} />
        {ipfsStatus && (
          <span style={{ fontSize: '13px', color: ipfsStatus.running ? 'var(--accent)' : 'var(--red)', fontVariantNumeric: 'tabular-nums' }}>
            {ipfsStatus.running ? `● node running · ${ipfsStatus.peers} peers` : '● node offline'}
          </span>
        )}
      </div>

      {/* Source filter pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '3px 12px',
            background: filter === f ? 'var(--accent-lo)' : 'transparent',
            border: `1px solid ${filter === f ? 'var(--accent-bdr)' : 'var(--border)'}`,
            borderRadius: '20px',
            color: filter === f ? 'var(--accent)' : 'var(--text-3)',
            fontSize: '12px', cursor: 'pointer',
            fontFamily: 'var(--font-ui)',
            transition: 'all var(--ease)',
          }}>{f}</button>
        ))}
      </div>

      {/* Chain / wallet / search + actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <select value={chainFilter} onChange={e => { setChainFilter(e.target.value); setPage(0) }} className="input" style={{ fontSize: '13px' }}>
          <option value="">All chains</option>
          {chains.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={walletFilter} onChange={e => { setWalletFilter(e.target.value); setPage(0) }} className="input" style={{ fontSize: '13px', maxWidth: '140px' }}>
          <option value="">All wallets</option>
          {wallets.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
        <input
          type="text" placeholder="Search…" value={search}
          onChange={e => { setSearch(e.target.value); setPage(0) }}
          className="input"
          style={{ width: '140px', fontSize: '13px' }}
        />
        <div style={{ flex: 1 }} />
        {selected.size > 0 && (
          <button onClick={() => setSelected(new Set())} className="btn btn-ghost">Deselect all</button>
        )}
        <button onClick={selectAllIpfs} className="btn btn-ghost">Select IPFS</button>
        {canUnpin && (
          <button onClick={unpinSelected} disabled={!canUnpin} className="btn btn-danger">
            {unpinning ? 'Unpinning…' : 'Unpin'}
          </button>
        )}
        <button
          onClick={pinSelected}
          disabled={!canPin}
          className="btn btn-primary"
          style={{ opacity: canPin ? 1 : 0.35 }}
        >
          {pinning ? 'Pinning…' : `Pin${selected.size ? ` (${selected.size})` : ''}`}
        </button>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1px' }}>
        {filtered.map(nft => {
          const source     = getSource(nft)
          const sc         = SOURCE_COLORS[source]
          const isSelected = selected.has(nft.id)
          const thumb      = nft.image?.thumbnailUrl || nft.image?.cachedUrl
          return (
            <div key={nft.id} onClick={() => toggleSelect(nft.id)} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '8px 10px', borderRadius: 'var(--r2)', cursor: 'pointer',
              background: isSelected ? 'var(--accent-xlo)' : 'transparent',
              borderLeft: isSelected ? '2px solid var(--accent-bdr)' : '2px solid transparent',
              transition: 'background var(--ease)',
            }}>
              <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(nft.id)}
                onClick={e => e.stopPropagation()}
                style={{ accentColor: 'var(--accent)', cursor: 'pointer', flexShrink: 0 }} />

              {thumb && (
                <img src={thumb} alt=""
                  style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: 'var(--r2)', flexShrink: 0 }}
                  onError={e => { e.target.style.display = 'none' }} />
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {nft.name || nft.contract?.name || 'Unnamed'}
                </div>
                {nft.cid && (
                  <div style={{ fontSize: '11px', color: 'var(--accent)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                    {nft.cid}
                  </div>
                )}
              </div>

              <span style={{ fontFamily: 'var(--font-display)', fontSize: '9px', fontWeight: 600, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.1em', flexShrink: 0 }}>{nft.chain}</span>
              <span style={{ fontSize: '11px', color: sc.color, background: sc.bg, padding: '2px 8px', borderRadius: '20px', flexShrink: 0 }}>
                {source}
              </span>
              {nft.cid && (
                <span className="badge badge-green" style={{ flexShrink: 0 }}>pinned</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: 'var(--text-3)', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="btn btn-ghost" style={{ padding: '4px 14px', fontSize: '13px' }}>prev</button>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{page + 1} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="btn btn-ghost" style={{ padding: '4px 14px', fontSize: '13px' }}>next</button>
        </div>
      )}

      {/* Log */}
      {logs.length > 0 && (
        <div style={{ maxHeight: '80px', overflowY: 'auto', fontSize: '11px', color: 'var(--text-3)', lineHeight: '1.7', fontFamily: 'var(--font-mono)', background: 'var(--bg-1)', borderRadius: 'var(--r1)', padding: '8px 12px' }}>
          {logs.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}
    </div>
  )
}

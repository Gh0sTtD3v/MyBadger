'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

const PAGE_SIZE = 80

export default function Gallery() {
  const { id: curationId } = useParams()

  const [curation, setCuration] = useState(null)
  const [stats,    setStats]    = useState(null)
  const [chains,   setChains]   = useState([])
  const [filter,   setFilterState] = useState({ chain: null, search: '' })
  const [result,   setResult]   = useState({ rows: [], total: 0 })
  const [loading,  setLoading]  = useState(true)
  const [page,     setPage]     = useState(0)
  const [selected, setSelected] = useState(null)
  const [wpStatus,     setWpStatus]     = useState(null)
  const [jsonStatus,   setJsonStatus]   = useState(null)
  const [folderStatus, setFolderStatus] = useState(null)

  function setFilter(patch) {
    setFilterState(prev => ({ ...prev, ...patch }))
    setPage(0)
  }

  useEffect(() => {
    if (!curationId || !window.electron) return
    setStats(null); setChains([]); setCuration(null)
    setWpStatus(null); setJsonStatus(null); setFolderStatus(null)
    Promise.all([
      window.electron.curations.get(curationId),
      window.electron.curated.stats(curationId),
      window.electron.curated.distinct(curationId, 'chain'),
    ]).then(([cur, s, c]) => { setCuration(cur); setStats(s); setChains(c) })
  }, [curationId])

  async function generateJson() {
    if (!window.electron) return
    setJsonStatus('saving')
    const res = await window.electron.curations.exportJson(curationId, curation?.name)
    if (res.canceled) { setJsonStatus(null); return }
    if (res.error)    { setJsonStatus({ ok: false, msg: res.error }); return }
    setJsonStatus({ ok: true, msg: res.filePath })
  }

  async function generateFolder() {
    if (!window.electron) return
    setFolderStatus('saving')
    const res = await window.electron.generateFolder(curationId, curation?.name)
    if (res.canceled) { setFolderStatus(null); return }
    if (res.error)    { setFolderStatus({ ok: false, msg: res.error }); return }
    setFolderStatus({ ok: true, msg: res.filePath })
  }

  async function generateWallpaper() {
    if (!window.electron) return
    setWpStatus('saving')
    const res = await window.electron.generateWallpaper(curationId, curation?.name)
    if (res.canceled) { setWpStatus(null); return }
    if (res.error)    { setWpStatus({ ok: false, msg: res.error }); return }
    setWpStatus({ ok: true, msg: res.filePath })
  }

  useEffect(() => {
    if (!curationId || !window.electron) return
    setLoading(true)
    window.electron.curated.nfts(curationId, {
      chain:  filter.chain  || undefined,
      search: filter.search || undefined,
      limit:  PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }).then(res => { setResult(res); setLoading(false) })
  }, [curationId, filter, page])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px', gap: '14px', boxSizing: 'border-box', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <h2 className="page-title">{curation?.name || 'Gallery'}</h2>
        <div style={{ flex: 1 }} />

        {/* Status messages */}
        {jsonStatus && typeof jsonStatus === 'object' && (
          <span style={{ fontSize: '12px', color: jsonStatus.ok ? 'var(--text-3)' : 'var(--red)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {jsonStatus.ok ? `✓ saved` : jsonStatus.msg}
          </span>
        )}
        {folderStatus && typeof folderStatus === 'object' && (
          <span style={{ fontSize: '12px', color: folderStatus.ok ? 'var(--text-3)' : 'var(--red)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {folderStatus.ok ? `✓ saved` : folderStatus.msg}
          </span>
        )}
        {wpStatus && typeof wpStatus === 'object' && (
          <span style={{ fontSize: '12px', color: wpStatus.ok ? 'var(--accent)' : 'var(--red)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {wpStatus.ok ? `✓ ${wpStatus.msg}` : wpStatus.msg}
          </span>
        )}

        {curation && (
          <button onClick={generateJson} disabled={jsonStatus === 'saving'} className="btn btn-ghost" style={{ fontSize: '12px', padding: '5px 12px' }}>
            {jsonStatus === 'saving' ? 'Saving…' : 'Export JSON'}
          </button>
        )}
        <button onClick={generateFolder} disabled={folderStatus === 'saving'} className="btn btn-ghost" style={{ fontSize: '12px', padding: '5px 12px' }}>
          {folderStatus === 'saving' ? 'Saving…' : 'Folder'}
        </button>
        <button onClick={generateWallpaper} disabled={wpStatus === 'saving'} className="btn btn-ghost" style={{ fontSize: '12px', padding: '5px 12px', color: wpStatus === 'saving' ? 'var(--text-4)' : 'var(--accent)', borderColor: wpStatus === 'saving' ? 'var(--border)' : 'var(--accent-bdr)' }}>
          {wpStatus === 'saving' ? 'Saving…' : 'Wallpaper'}
        </button>
      </div>

      <StatsBar stats={stats} />
      <FilterRow chains={chains} filter={filter} setFilter={setFilter} />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <NftGrid rows={result.rows} loading={loading} onSelect={setSelected} />
        <Pagination page={page} total={result.total} pageSize={PAGE_SIZE} setPage={setPage} />
      </div>

      {selected && <DetailModal nft={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function StatsBar({ stats }) {
  if (!stats) return null
  const items = [
    { label: 'Total',      value: stats.total },
    { label: 'With media', value: stats.withMedia },
    { label: 'Videos',     value: stats.videos },
  ]
  return (
    <div style={{ display: 'flex', gap: '28px', paddingBottom: '14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
      {items.map(({ label, value }) => (
        <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, color: 'var(--accent)', letterSpacing: '-0.02em', lineHeight: 1 }}>{value ?? '—'}</span>
          <span className="section-label">{label}</span>
        </div>
      ))}
    </div>
  )
}

function FilterRow({ chains, filter, setFilter }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', flexShrink: 0 }}>
      <Pill label="All" active={!filter.chain} onClick={() => setFilter({ chain: null })} />
      {chains.map(({ value, count }) => (
        <Pill key={value} label={`${value} · ${count}`} active={filter.chain === value} onClick={() => setFilter({ chain: value })} />
      ))}
      <div style={{ flex: 1 }} />
      <input
        type="text"
        placeholder="Search…"
        value={filter.search}
        onChange={e => setFilter({ search: e.target.value })}
        className="input"
        style={{ width: '160px', fontSize: '13px' }}
      />
    </div>
  )
}

function Pill({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '4px 12px',
      background: active ? 'var(--accent-xlo)' : 'var(--bg-1)',
      border: `1px solid ${active ? 'var(--accent-bdr)' : 'var(--border)'}`,
      borderRadius: '999px',
      color: active ? 'var(--accent)' : 'var(--text-3)',
      fontSize: '12px',
      fontWeight: active ? 500 : 400,
      cursor: 'pointer',
      transition: 'all var(--ease)',
      fontFamily: 'var(--font-ui)',
    }}>
      {label}
    </button>
  )
}

function NftGrid({ rows, loading, onSelect }) {
  if (loading) return <div style={{ color: 'var(--text-4)', fontSize: '14px', padding: '32px 0' }}>Loading…</div>
  if (!rows.length) return <div style={{ color: 'var(--text-4)', fontSize: '14px', padding: '32px 0' }}>No NFTs found.</div>
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: '12px', paddingBottom: '24px' }}>
      {rows.map(nft => <NftCard key={nft._id} nft={nft} onSelect={onSelect} />)}
    </div>
  )
}

function mediaUrl(p) {
  return `nftmedia://local/${encodeURIComponent(p)}`
}

function getSource(nft) {
  const url = nft.imageUrl || nft.videoUrl || ''
  if (/ipfs|nftstorage|dweb\.link/i.test(url)) return 'ipfs'
  if (/arweave\.net/i.test(url))               return 'arweave'
  return 'http'
}

const SOURCE_COLORS = {
  ipfs:    { color: 'var(--accent)', bg: 'var(--green-bg)', bdr: 'var(--green-bdr)' },
  arweave: { color: 'var(--blue)',   bg: 'var(--blue-bg)',  bdr: 'var(--blue-bdr)'  },
  http:    null,
}

function NftCard({ nft, onSelect }) {
  const thumbSrc   = nft.thumbPath ? mediaUrl(nft.thumbPath) : null
  const isVideo    = nft.mediaType === 'video'
  const name       = nft.name || 'Unnamed'
  const collection = nft.collection || ''
  const source     = getSource(nft)
  const sc         = SOURCE_COLORS[source]

  return (
    <div
      onClick={() => onSelect(nft)}
      style={{
        background: 'var(--bg-1)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r3)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        transition: 'transform var(--ease), border-color var(--ease), box-shadow var(--ease)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)'
        e.currentTarget.style.borderColor = 'var(--border-md)'
        e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.45)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div style={{ width: '100%', aspectRatio: '1/1', background: 'var(--bg-2)', overflow: 'hidden' }}>
        {thumbSrc ? (
          <img src={thumbSrc} alt={name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { e.target.style.display = 'none' }} />
        ) : isVideo && nft.localPath ? (
          <video src={mediaUrl(nft.localPath)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted loop playsInline
            onMouseEnter={e => e.target.play()} onMouseLeave={e => { e.target.pause(); e.target.currentTime = 0 }} />
        ) : nft.imageUrl ? (
          <img src={nft.imageUrl} alt={name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { e.target.style.display = 'none' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-4)', fontSize: '11px', letterSpacing: '0.06em' }}>NO MEDIA</div>
        )}
      </div>

      <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
        <div style={{ fontSize: '11px', color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{collection}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '9px', fontWeight: 600, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{nft.chain}</span>
          <div style={{ display: 'flex', gap: '3px' }}>
            {isVideo && <span className="badge badge-blue">video</span>}
            {sc && <span className="badge" style={{ color: sc.color, background: sc.bg, border: `1px solid ${sc.bdr}` }}>{source}</span>}
            {nft.cid && <span className="badge badge-green">pinned</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

function DetailModal({ nft, onClose }) {
  const [view,       setView]       = useState('info')
  const [rawData,    setRawData]    = useState(null)
  const [fullscreen, setFullscreen] = useState(false)

  const isVideo = nft.mediaType === 'video'
  const src = nft.localPath ? mediaUrl(nft.localPath) : (nft.videoUrl || nft.imageUrl || null)
  const fields = [
    { label: 'Chain',      value: nft.chain },
    { label: 'Collection', value: nft.collection },
    { label: 'Wallet',     value: nft.wallet },
    { label: 'Contract',   value: nft.contract },
    { label: 'Token ID',   value: nft.tokenId },
  ]

  function openMetadata() {
    setView('metadata')
    if (!rawData && window.electron) window.electron.raw.getById(nft.nftId).then(setRawData)
  }

  if (fullscreen) return (
    <div onClick={() => setFullscreen(false)} style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, cursor: 'zoom-out' }}>
      {isVideo
        ? <video src={src} controls autoPlay loop style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onClick={e => e.stopPropagation()} />
        : <img src={src} alt={nft.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />}
    </div>
  )

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '24px', backdropFilter: 'blur(4px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-1)', border: '1px solid var(--border-md)', borderRadius: 'var(--r4)', maxWidth: '720px', width: '100%', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Media */}
        <div style={{ background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', maxHeight: '420px', overflow: 'hidden' }}>
          {src ? (
            isVideo
              ? <video src={src} controls autoPlay loop muted style={{ maxWidth: '100%', maxHeight: '420px', objectFit: 'contain' }} />
              : <img src={src} alt={nft.name} style={{ maxWidth: '100%', maxHeight: '420px', objectFit: 'contain' }} />
          ) : (
            <div style={{ padding: '56px', color: 'var(--text-4)', fontSize: '13px', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>No media</div>
          )}
        </div>

        {/* Header row */}
        <div style={{ padding: '16px 20px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '3px', letterSpacing: '0.01em' }}>{nft.name || 'Unnamed'}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>{nft.collection || ''}</div>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
            {src && <button onClick={() => setFullscreen(true)} className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: '12px' }}>Fullscreen</button>}
            <button onClick={view === 'info' ? openMetadata : () => setView('info')} className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: '12px' }}>
              {view === 'info' ? 'Metadata' : 'Info'}
            </button>
            <button onClick={onClose} className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: '12px' }}>Close</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px 20px', overflowY: 'auto', flex: 1 }}>
          {view === 'info' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {fields.filter(f => f.value).map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', gap: '16px', alignItems: 'baseline' }}>
                  <span className="section-label" style={{ minWidth: '72px', flexShrink: 0 }}>{label}</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-2)', wordBreak: 'break-all', fontFamily: /contract|token|wallet/i.test(label) ? 'var(--font-mono)' : 'var(--font-ui)' }}>{value}</span>
                </div>
              ))}
            </div>
          ) : (
            <pre style={{ margin: 0, fontSize: '12px', color: 'var(--text-3)', lineHeight: '1.7', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'var(--font-mono)' }}>
              {rawData ? JSON.stringify(rawData, null, 2) : 'Loading…'}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}

function Pagination({ page, total, pageSize, setPage }) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', padding: '16px 0', fontSize: '13px', color: 'var(--text-3)' }}>
      <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="btn btn-ghost" style={{ padding: '4px 14px', fontSize: '13px' }}>prev</button>
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{page + 1} / {totalPages}</span>
      <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="btn btn-ghost" style={{ padding: '4px 14px', fontSize: '13px' }}>next</button>
    </div>
  )
}

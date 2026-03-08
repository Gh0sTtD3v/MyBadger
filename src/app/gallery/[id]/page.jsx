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
  const [wpStatus,     setWpStatus]     = useState(null)  // null | 'saving' | { ok, msg }
  const [jsonStatus,   setJsonStatus]   = useState(null) // null | 'saving' | { ok, msg }
  const [folderStatus, setFolderStatus] = useState(null) // null | 'saving' | { ok, msg }

  function setFilter(patch) {
    setFilterState(prev => ({ ...prev, ...patch }))
    setPage(0)
  }

  useEffect(() => {
    if (!curationId || !window.electron) return
    setStats(null)
    setChains([])
    setCuration(null)
    setWpStatus(null)
    setJsonStatus(null)
    setFolderStatus(null)
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px', gap: '12px', boxSizing: 'border-box', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <h2 style={{ margin: 0, fontSize: '14px', color: '#a3e635' }}>{curation?.name || 'Gallery'}</h2>
        {curation && (
          <button
            onClick={generateJson}
            disabled={jsonStatus === 'saving'}
            style={{
              padding: '5px 12px', background: 'transparent',
              border: '1px solid #222', borderRadius: '4px',
              color: jsonStatus === 'saving' ? '#444' : '#555',
              cursor: jsonStatus === 'saving' ? 'not-allowed' : 'pointer',
              fontSize: '11px', fontFamily: 'monospace', flexShrink: 0,
            }}
          >
            {jsonStatus === 'saving' ? 'Saving...' : 'Generate JSON'}
          </button>
        )}
        {jsonStatus && typeof jsonStatus === 'object' && (
          <span style={{ fontSize: '10px', color: jsonStatus.ok ? '#555' : '#ef4444', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {jsonStatus.ok ? `✓ ${jsonStatus.msg}` : jsonStatus.msg}
          </span>
        )}
        <div style={{ flex: 1 }} />
        {folderStatus && typeof folderStatus === 'object' && (
          <span style={{ fontSize: '10px', color: folderStatus.ok ? '#555' : '#ef4444', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {folderStatus.ok ? `Saved: ${folderStatus.msg}` : folderStatus.msg}
          </span>
        )}
        <button
          onClick={generateFolder}
          disabled={folderStatus === 'saving'}
          style={{
            padding: '5px 12px', background: 'transparent',
            border: '1px solid #222', borderRadius: '4px',
            color: folderStatus === 'saving' ? '#444' : '#555',
            cursor: folderStatus === 'saving' ? 'not-allowed' : 'pointer',
            fontSize: '11px', fontFamily: 'monospace', flexShrink: 0,
          }}
        >
          {folderStatus === 'saving' ? 'Saving...' : 'Generate Folder'}
        </button>
        {wpStatus && typeof wpStatus === 'object' && (
          <span style={{ fontSize: '10px', color: wpStatus.ok ? '#a3e635' : '#ef4444', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {wpStatus.ok ? `Saved: ${wpStatus.msg}` : wpStatus.msg}
          </span>
        )}
        <button
          onClick={generateWallpaper}
          disabled={wpStatus === 'saving'}
          style={{
            padding: '5px 12px', background: 'transparent',
            border: '1px solid #2a4a10', borderRadius: '4px',
            color: wpStatus === 'saving' ? '#444' : '#a3e635',
            cursor: wpStatus === 'saving' ? 'not-allowed' : 'pointer',
            fontSize: '11px', fontFamily: 'monospace', flexShrink: 0,
          }}
        >
          {wpStatus === 'saving' ? 'Saving...' : 'Generate Wallpaper'}
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
    { label: 'total',      value: stats.total },
    { label: 'with media', value: stats.withMedia },
    { label: 'videos',     value: stats.videos },
  ]
  return (
    <div style={{ display: 'flex', gap: '24px', paddingBottom: '12px', borderBottom: '1px solid #1c1c1c' }}>
      {items.map(({ label, value }) => (
        <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ color: '#a3e635', fontSize: '13px', fontWeight: 600 }}>{value ?? '—'}</span>
          <span style={{ color: '#444', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        </div>
      ))}
    </div>
  )
}

function FilterRow({ chains, filter, setFilter }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      <Pill label="all" active={!filter.chain} onClick={() => setFilter({ chain: null })} />
      {chains.map(({ value, count }) => (
        <Pill key={value} label={`${value} (${count})`} active={filter.chain === value} onClick={() => setFilter({ chain: value })} />
      ))}
      <div style={{ flex: 1 }} />
      <input
        type="text"
        placeholder="search..."
        value={filter.search}
        onChange={e => setFilter({ search: e.target.value })}
        style={{ padding: '5px 10px', background: '#111', border: '1px solid #222', borderRadius: '4px', color: '#e5e5e5', fontSize: '11px', fontFamily: 'monospace', outline: 'none', width: '160px' }}
      />
    </div>
  )
}

function Pill({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '3px 10px', background: active ? '#1a3a00' : '#111',
      border: `1px solid ${active ? '#4a7a10' : '#222'}`, borderRadius: '12px',
      color: active ? '#a3e635' : '#555', fontSize: '10px', fontFamily: 'monospace', cursor: 'pointer',
    }}>
      {label}
    </button>
  )
}

function NftGrid({ rows, loading, onSelect }) {
  if (loading) return <div style={{ color: '#333', fontSize: '11px', padding: '24px' }}>Loading...</div>
  if (!rows.length) return <div style={{ color: '#333', fontSize: '11px', padding: '24px' }}>No NFTs found.</div>
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px', paddingBottom: '24px' }}>
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
  ipfs:    { color: '#a3e635', bg: '#1a2a00' },
  arweave: { color: '#60a5fa', bg: '#001a2a' },
  http:    null,
}

function NftCard({ nft, onSelect }) {
  const thumbSrc = nft.thumbPath ? mediaUrl(nft.thumbPath) : null
  const isVideo  = nft.mediaType === 'video'
  const name     = nft.name || 'Unnamed'
  const collection = nft.collection || ''
  const source   = getSource(nft)
  const sc       = SOURCE_COLORS[source]

  return (
    <div
      onClick={() => onSelect(nft)}
      style={{ background: '#0d0d0d', border: '1px solid #1c1c1c', borderRadius: '6px', overflow: 'hidden', display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'border-color 0.15s ease' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#2a2a2a'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#1c1c1c'}
    >
      <div style={{ width: '100%', aspectRatio: '1/1', background: '#111', overflow: 'hidden' }}>
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
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#222', fontSize: '10px' }}>no media</div>
        )}
      </div>
      <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <div style={{ fontSize: '11px', color: '#d4d4d4', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
        <div style={{ fontSize: '9px', color: '#444', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{collection}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
          <span style={{ fontSize: '9px', color: '#2a2a2a' }}>{nft.chain}</span>
          <div style={{ display: 'flex', gap: '3px' }}>
            {isVideo && <span style={{ fontSize: '8px', color: '#1a2a3a', background: '#0a1a2a', padding: '1px 5px', borderRadius: '8px' }}>video</span>}
            {sc && <span style={{ fontSize: '8px', color: sc.color, background: sc.bg, padding: '1px 5px', borderRadius: '8px' }}>{source}</span>}
            {nft.cid && <span style={{ fontSize: '8px', color: '#a3e635', background: '#1a3a00', padding: '1px 5px', borderRadius: '8px' }}>pinned</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

function DetailModal({ nft, onClose }) {
  const [view,       setView]       = useState('info')   // 'info' | 'metadata'
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
    if (!rawData && window.electron) {
      window.electron.raw.getById(nft.nftId).then(setRawData)
    }
  }

  if (fullscreen) return (
    <div
      onClick={() => setFullscreen(false)}
      style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, cursor: 'zoom-out' }}
    >
      {isVideo ? (
        <video src={src} controls autoPlay loop style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onClick={e => e.stopPropagation()} />
      ) : (
        <img src={src} alt={nft.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
      )}
    </div>
  )

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '24px' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#0d0d0d', border: '1px solid #222', borderRadius: '8px', maxWidth: '720px', width: '100%', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      >
        {/* Media */}
        <div style={{ background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', maxHeight: '420px', overflow: 'hidden' }}>
          {src ? (
            isVideo ? (
              <video src={src} controls autoPlay loop muted style={{ maxWidth: '100%', maxHeight: '420px', objectFit: 'contain' }} />
            ) : (
              <img src={src} alt={nft.name} style={{ maxWidth: '100%', maxHeight: '420px', objectFit: 'contain' }} />
            )
          ) : (
            <div style={{ padding: '48px', color: '#333', fontSize: '12px' }}>no media</div>
          )}
        </div>

        {/* Header row */}
        <div style={{ padding: '16px 20px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: '14px', color: '#e5e5e5', marginBottom: '3px' }}>{nft.name || 'Unnamed'}</div>
            <div style={{ fontSize: '11px', color: '#555' }}>{nft.collection || ''}</div>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
            {src && (
              <button onClick={() => setFullscreen(true)} style={modalBtn}>Fullscreen</button>
            )}
            <button onClick={view === 'info' ? openMetadata : () => setView('info')} style={modalBtn}>
              {view === 'info' ? 'Metadata' : 'Info'}
            </button>
            <button onClick={onClose} style={modalBtn}>Close</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px 20px', overflowY: 'auto', flex: 1 }}>
          {view === 'info' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {fields.filter(f => f.value).map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
                  <span style={{ color: '#444', minWidth: '72px', flexShrink: 0 }}>{label}</span>
                  <span style={{ color: '#888', wordBreak: 'break-all' }}>{value}</span>
                </div>
              ))}
            </div>
          ) : (
            <pre style={{ margin: 0, fontSize: '10px', color: '#666', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {rawData ? JSON.stringify(rawData, null, 2) : 'Loading...'}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}

const modalBtn = { background: 'none', border: '1px solid #333', borderRadius: '4px', color: '#555', cursor: 'pointer', padding: '4px 10px', fontSize: '11px', fontFamily: 'monospace' }

function Pagination({ page, total, pageSize, setPage }) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', padding: '12px 0', fontSize: '11px', color: '#555' }}>
      <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={pageBtn}>prev</button>
      <span>{page + 1} / {totalPages}</span>
      <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} style={pageBtn}>next</button>
    </div>
  )
}

const pageBtn = { padding: '3px 10px', background: '#111', border: '1px solid #222', borderRadius: '4px', color: '#555', cursor: 'pointer', fontSize: '11px', fontFamily: 'monospace' }

'use client'

import { useState } from 'react'

const PLACEHOLDER = JSON.stringify({
  name: "Example NFT",
  description: "A test token",
  image: "ipfs://QmExampleHash/image.png",
  animation_url: "https://example.com/animation.mp4",
  attributes: [{ trait_type: "Background", value: "Blue" }]
}, null, 2)

export default function DevPage() {
  const [input,   setInput]   = useState('')
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [pruning, setPruning] = useState(false)
  const [pruneResult, setPruneResult] = useState(null)

  async function runTest() {
    if (!input.trim() || !window.electron) return
    setLoading(true)
    setResult(null)
    const res = await window.electron.llm.test(input.trim())
    setResult(res)
    setLoading(false)
  }

  function loadExample() {
    setInput(PLACEHOLDER)
    setResult(null)
  }

  async function pruneIpfs() {
    if (!window.electron) return
    setPruning(true)
    setPruneResult(null)
    const res = await window.electron.ipfs.prune()
    setPruneResult(res)
    setPruning(false)
  }

  const hasResult = result !== null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <h2 className="page-title">LLM Test</h2>
        <span className="badge badge-muted">dev</span>
        <div style={{ flex: 1 }} />
        <button onClick={loadExample} className="btn btn-ghost">Load example</button>
        <button
          onClick={runTest}
          disabled={loading || !input.trim()}
          className="btn btn-primary"
          style={{ opacity: !input.trim() && !loading ? 0.35 : 1 }}
        >
          {loading ? 'Running…' : 'Run'}
        </button>
      </div>

      {/* IPFS tools */}
      <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <span className="section-label">IPFS</span>
        <button onClick={pruneIpfs} disabled={pruning} className="btn btn-ghost">
          {pruning ? 'Pruning…' : 'Prune blockstore'}
        </button>
        {pruneResult && (
          pruneResult.error
            ? <span style={{ fontSize: '12px', color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>{pruneResult.error}</span>
            : <span style={{ fontSize: '12px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{pruneResult.pruned} block{pruneResult.pruned !== 1 ? 's' : ''} removed</span>
        )}
      </div>

      {/* Split panes */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top — input */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--border)', overflow: 'hidden' }}>
          <div className="section-label" style={{ padding: '10px 24px 6px', flexShrink: 0 }}>
            Input — paste NFT metadata JSON
          </div>
          <textarea
            value={input}
            onChange={e => { setInput(e.target.value); setResult(null) }}
            placeholder={PLACEHOLDER}
            spellCheck={false}
            style={{
              flex: 1,
              resize: 'none',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-2)',
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              lineHeight: '1.65',
              padding: '8px 24px 16px',
              width: '100%',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Bottom — result */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="section-label" style={{ padding: '10px 24px 6px', flexShrink: 0 }}>
            Result
          </div>
          <div style={{ flex: 1, padding: '8px 24px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {!hasResult && !loading && (
              <div style={{ color: 'var(--text-3)', fontSize: '14px', paddingTop: '8px' }}>
                Paste metadata JSON above and click Run.
              </div>
            )}
            {loading && (
              <div style={{ color: 'var(--text-3)', fontSize: '14px', paddingTop: '8px' }}>
                Asking the model…
              </div>
            )}
            {hasResult && result.error && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span className="section-label">Error</span>
                <span style={{ fontSize: '14px', color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>{result.error}</span>
              </div>
            )}
            {hasResult && !result.error && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span className="section-label">Raw model response</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-2)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
                    {result.raw ?? '—'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span className="section-label">Extracted URL</span>
                  {result.url ? (
                    <span style={{ fontSize: '14px', color: 'var(--accent)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{result.url}</span>
                  ) : (
                    <span style={{ fontSize: '14px', color: 'var(--text-3)' }}>null — no URL found</span>
                  )}
                </div>
                {result.url && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span className="section-label">Preview</span>
                    <img
                      src={result.url.replace('ipfs://', 'https://nftstorage.link/ipfs/').replace('ar://', 'https://arweave.net/')}
                      alt="preview"
                      style={{ maxWidth: '320px', maxHeight: '320px', objectFit: 'contain', borderRadius: 'var(--r2)', border: '1px solid var(--border)', background: 'var(--bg-1)' }}
                      onError={e => { e.target.style.display = 'none' }}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useConfig } from '../../context/ConfigContext'

export default function Config() {
  const { apiKey, setApiKey, unisatKey, setUnisatKey } = useConfig()
  const [mediaDir,    setMediaDir]    = useState('')
  const [ipfsStatus,  setIpfsStatus]  = useState(null)
  const [llmStatus,   setLlmStatus]   = useState(null)
  const [llmProgress, setLlmProgress] = useState(null)

  useEffect(() => {
    if (!window.electron) return
    window.electron.settings.getMediaDir().then(setMediaDir)
    window.electron.ipfs.status().then(setIpfsStatus)
    window.electron.llm.status().then(setLlmStatus)
  }, [])

  async function downloadModel() {
    if (!window.electron) return
    setLlmProgress({ downloaded: 0, total: 0 })
    window.electron.llm.onEvent(p => setLlmProgress(p))
    const result = await window.electron.llm.download()
    window.electron.llm.removeListeners()
    if (result.ok) {
      setLlmProgress(null)
      window.electron.llm.status().then(setLlmStatus)
    } else {
      setLlmProgress({ error: result.error })
    }
  }

  async function browseFolder() {
    const selected = await window.electron.settings.selectFolder()
    if (!selected) return
    await window.electron.settings.setMediaDir(selected)
    setMediaDir(selected)
  }

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '640px' }}>
      <h2 className="page-title">Config</h2>

      <Field label="Alchemy API Key" guide={{ label: 'How to get an API key', href: 'https://www.alchemy.com/docs/create-an-api-key' }}>
        <input
          type="password"
          placeholder="Enter Alchemy API key"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          className="input"
          style={{ width: '100%' }}
        />
      </Field>

      <Field label="UniSat API Key · Bitcoin Ordinals" guide={{ label: 'How to get an API key', href: 'https://docs.unisat.io/developer-support/how-to-acquire-a-unisat-api-key' }}>
        <input
          type="password"
          placeholder="Enter UniSat API key"
          value={unisatKey}
          onChange={e => setUnisatKey(e.target.value)}
          className="input"
          style={{ width: '100%' }}
        />
      </Field>

      <Field label="Media Folder">
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div className="input" style={{ flex: 1, color: mediaDir ? 'var(--text-2)' : 'var(--text-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px', fontFamily: mediaDir ? 'var(--font-mono)' : 'var(--font-ui)' }}>
            {mediaDir || 'default'}
          </div>
          <button onClick={browseFolder} className="btn btn-ghost">Browse</button>
        </div>
      </Field>

      <Field label="AI Model · Phi-3.5 Mini (~2 GB)">
        <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {llmStatus === null ? (
            <span style={{ color: 'var(--text-4)' }}>loading…</span>
          ) : llmStatus.ready ? (
            <span style={{ color: 'var(--accent)' }}>● ready</span>
          ) : llmStatus.downloaded ? (
            <span style={{ color: 'var(--blue)' }}>● downloaded · loading…</span>
          ) : (
            <>
              <span style={{ color: 'var(--text-3)' }}>● not downloaded</span>
              {llmProgress ? (
                llmProgress.error ? (
                  <span style={{ color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{llmProgress.error}</span>
                ) : llmProgress.total > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ height: '2px', background: 'var(--bg-3)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(llmProgress.downloaded / llmProgress.total) * 100}%`, background: 'var(--blue)', transition: 'width 0.3s ease' }} />
                    </div>
                    <span style={{ color: 'var(--text-3)', fontSize: '12px', fontVariantNumeric: 'tabular-nums' }}>
                      {(llmProgress.downloaded / 1e6).toFixed(0)} / {(llmProgress.total / 1e6).toFixed(0)} MB
                    </span>
                  </div>
                ) : (
                  <span style={{ color: 'var(--text-3)' }}>connecting…</span>
                )
              ) : (
                <button onClick={downloadModel} className="btn btn-ghost" style={{ alignSelf: 'flex-start' }}>Download</button>
              )}
            </>
          )}
        </div>
      </Field>

      <Field label="IPFS Node">
        <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {ipfsStatus === null ? (
            <span style={{ color: 'var(--text-4)' }}>loading…</span>
          ) : ipfsStatus.running ? (
            <>
              <span style={{ color: 'var(--accent)' }}>● running</span>
              <span style={{ color: 'var(--text-3)', wordBreak: 'break-all', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{ipfsStatus.peerId}</span>
              <span style={{ color: 'var(--text-3)' }}>{ipfsStatus.peers} peers</span>
            </>
          ) : (
            <span style={{ color: 'var(--red)' }}>● offline{ipfsStatus.error ? ` — ${ipfsStatus.error}` : ''}</span>
          )}
        </div>
      </Field>
    </div>
  )
}

function GuideLink({ href, label }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <a href={href} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: 'var(--text-3)', textDecoration: 'none', borderBottom: '1px solid var(--border)' }}
          onMouseEnter={e => e.target.style.color = 'var(--accent)'}
          onMouseLeave={e => e.target.style.color = 'var(--text-3)'}
        >{label} ↗</a>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-4)' }}>or visit:</span>
        <button onClick={copy} style={{
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          fontSize: '11px', fontFamily: 'var(--font-mono)',
          color: copied ? 'var(--accent)' : 'var(--text-3)',
          transition: 'color var(--ease)',
          wordBreak: 'break-all', textAlign: 'left',
        }}>{copied ? 'copied!' : href}</button>
      </div>
    </div>
  )
}

function Field({ label, guide, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label className="section-label">{label}</label>
        {guide && <GuideLink href={guide.href} label={guide.label} />}
      </div>
      {children}
    </div>
  )
}

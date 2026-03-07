'use client'

import { useEffect, useState } from 'react'
import { useConfig } from '../../context/ConfigContext'

export default function Config() {
  const { apiKey, setApiKey } = useConfig()
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
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '480px' }}>
      <h2 style={{ margin: 0, fontSize: '14px', color: '#a3e635' }}>Config</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={labelStyle}>API Key</label>
        <input
          type="password"
          placeholder="Enter Alchemy API key"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          style={inputStyle}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={labelStyle}>Media Folder</label>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ ...inputStyle, flex: 1, color: mediaDir ? '#888' : '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {mediaDir || 'default'}
          </div>
          <button onClick={browseFolder} style={browseBtn}>Browse</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={labelStyle}>AI Model (Phi-3.5 Mini · ~2GB)</label>
        <div style={{ fontSize: '11px', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {llmStatus === null ? (
            <span style={{ color: '#333' }}>loading...</span>
          ) : llmStatus.ready ? (
            <span style={{ color: '#a3e635' }}>● ready</span>
          ) : llmStatus.downloaded ? (
            <span style={{ color: '#60a5fa' }}>● downloaded · loading...</span>
          ) : (
            <>
              <span style={{ color: '#555' }}>● not downloaded</span>
              {llmProgress ? (
                llmProgress.error ? (
                  <span style={{ color: '#ef4444' }}>{llmProgress.error}</span>
                ) : llmProgress.total > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ height: '3px', background: '#1a1a1a', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(llmProgress.downloaded / llmProgress.total) * 100}%`, background: '#60a5fa', transition: 'width 0.3s ease' }} />
                    </div>
                    <span style={{ color: '#444', fontSize: '10px' }}>
                      {(llmProgress.downloaded / 1e6).toFixed(0)} / {(llmProgress.total / 1e6).toFixed(0)} MB
                    </span>
                  </div>
                ) : (
                  <span style={{ color: '#444' }}>connecting...</span>
                )
              ) : (
                <button onClick={downloadModel} style={browseBtn}>Download</button>
              )}
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={labelStyle}>IPFS Node</label>
        <div style={{ fontSize: '11px', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {ipfsStatus === null ? (
            <span style={{ color: '#333' }}>loading...</span>
          ) : ipfsStatus.running ? (
            <>
              <span style={{ color: '#a3e635' }}>● running</span>
              <span style={{ color: '#444', wordBreak: 'break-all' }}>{ipfsStatus.peerId}</span>
              <span style={{ color: '#333' }}>{ipfsStatus.peers} peers</span>
            </>
          ) : (
            <span style={{ color: '#7a3a3a' }}>● offline{ipfsStatus.error ? ` — ${ipfsStatus.error}` : ''}</span>
          )}
        </div>
      </div>

    </div>
  )
}

const labelStyle = {
  fontSize: '10px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#444',
}

const browseBtn = {
  padding: '7px 14px',
  background: 'transparent',
  border: '1px solid #222',
  borderRadius: '4px',
  color: '#555',
  cursor: 'pointer',
  fontSize: '12px',
  fontFamily: 'monospace',
  flexShrink: 0,
}

const inputStyle = {
  padding: '7px 10px',
  background: '#111',
  border: '1px solid #222',
  borderRadius: '4px',
  color: '#e5e5e5',
  fontSize: '12px',
  fontFamily: 'monospace',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

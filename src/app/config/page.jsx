'use client'

import { useEffect, useState } from 'react'
import { useConfig } from '../../context/ConfigContext'

export default function Config() {
  const { apiKey, setApiKey } = useConfig()
  const [mediaDir,    setMediaDir]    = useState('')
  const [ipfsStatus,  setIpfsStatus]  = useState(null)

  useEffect(() => {
    if (!window.electron) return
    window.electron.settings.getMediaDir().then(setMediaDir)
    window.electron.ipfs.status().then(setIpfsStatus)
  }, [])

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

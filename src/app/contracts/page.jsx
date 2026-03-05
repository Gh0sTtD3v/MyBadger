'use client'

import { useEffect, useRef, useState } from 'react'
import { useConfig } from '../../context/ConfigContext'

const CHAINS = [
  { key: 'eth',      label: 'Ethereum' },
  { key: 'base',     label: 'Base' },
  { key: 'arbitrum', label: 'Arbitrum' },
  { key: 'optimism', label: 'Optimism' },
  { key: 'apechain', label: 'ApeChain' },
]

const empty = () => ({ address: '', chain: 'eth' })

export default function Contracts() {
  const { apiKey } = useConfig()
  const [contracts, setContracts] = useState([empty()])
  const [scanning,  setScanning]  = useState(false)
  const [logs,      setLogs]      = useState([])
  const [rawCount,  setRawCount]  = useState(null)
  const logEndRef = useRef(null)

  useEffect(() => {
    if (!window.electron) return
    window.electron.raw.count().then(setRawCount)
  }, [])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  async function scan() {
    if (!window.electron || !apiKey.trim()) return
    const valid = contracts.filter(c => c.address.trim())
    if (!valid.length) return

    setScanning(true)
    setLogs([])

    window.electron.onEvent((payload) => {
      if (payload.type === 'done' || payload.type === 'error') {
        setScanning(false)
        window.electron.removeListeners()
        window.electron.raw.count().then(setRawCount)
      }
      setLogs(prev => [...prev, payload.message])
    })

    await window.electron.runContract(apiKey.trim(), valid.map(c => ({ address: c.address.trim(), chain: c.chain })))
  }

  function set(i, patch)  { setContracts(prev => prev.map((c, idx) => idx === i ? { ...c, ...patch } : c)) }
  function add()          { setContracts(prev => [...prev, empty()]) }
  function remove(i)      { setContracts(prev => prev.length === 1 ? [empty()] : prev.filter((_, idx) => idx !== i)) }

  const canScan = !scanning && apiKey.trim() && contracts.some(c => c.address.trim())

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontSize: '14px', color: '#a3e635' }}>Contracts</h2>
        {rawCount !== null && (
          <span style={{ fontSize: '11px', color: '#444' }}>{rawCount} NFTs in raw index</span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '560px' }}>
        {contracts.map((c, i) => (
          <div key={i} style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              placeholder="0x contract address..."
              value={c.address}
              onChange={e => set(i, { address: e.target.value })}
              style={inputStyle}
            />
            <select
              value={c.chain}
              onChange={e => set(i, { chain: e.target.value })}
              style={selectStyle}
            >
              {CHAINS.map(ch => <option key={ch.key} value={ch.key}>{ch.label}</option>)}
            </select>
            <button onClick={() => remove(i)} style={removeBtnStyle}>×</button>
          </div>
        ))}
        <button onClick={add} style={addBtnStyle}>+ Add contract</button>
      </div>

      <button
        onClick={scan}
        disabled={!canScan}
        style={{
          alignSelf: 'flex-start',
          padding: '8px 18px',
          background: scanning ? '#1a3a00' : '#16a34a',
          color: '#fff', border: 'none', borderRadius: '4px',
          cursor: canScan ? 'pointer' : 'not-allowed',
          fontSize: '12px', fontFamily: 'monospace',
          opacity: canScan ? 1 : 0.4,
        }}
      >
        {scanning ? 'Scanning...' : 'Scan Contracts'}
      </button>

      {logs.length > 0 && (
        <div style={{ flex: 1, background: '#0d0d0d', borderRadius: '6px', padding: '12px', overflowY: 'auto', fontSize: '11px', lineHeight: '1.7', color: '#d4d4d4' }}>
          {logs.map((l, i) => <div key={i}>{l}</div>)}
          <div ref={logEndRef} />
        </div>
      )}
    </div>
  )
}

const inputStyle    = { flex: 1, padding: '7px 10px', background: '#111', border: '1px solid #222', borderRadius: '4px', color: '#e5e5e5', fontSize: '12px', fontFamily: 'monospace', outline: 'none' }
const selectStyle   = { padding: '7px 10px', background: '#111', border: '1px solid #222', borderRadius: '4px', color: '#e5e5e5', fontSize: '12px', fontFamily: 'monospace', outline: 'none', flexShrink: 0 }
const removeBtnStyle = { padding: '0 12px', background: '#111', border: '1px solid #222', borderRadius: '4px', color: '#555', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }
const addBtnStyle   = { alignSelf: 'flex-start', padding: '5px 12px', background: 'transparent', border: '1px solid #222', borderRadius: '4px', color: '#555', cursor: 'pointer', fontSize: '11px', fontFamily: 'monospace' }

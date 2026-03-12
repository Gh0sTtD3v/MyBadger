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
        <h2 className="page-title">Contracts</h2>
        {rawCount !== null && (
          <span style={{ fontSize: '12px', color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>{rawCount} NFTs indexed</span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '560px' }}>
        {contracts.map((c, i) => (
          <div key={i} style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              placeholder="0x contract address…"
              value={c.address}
              onChange={e => set(i, { address: e.target.value })}
              className="input"
              style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '13px' }}
            />
            <select
              value={c.chain}
              onChange={e => set(i, { chain: e.target.value })}
              className="input"
              style={{ fontSize: '13px', flexShrink: 0 }}
            >
              {CHAINS.map(ch => <option key={ch.key} value={ch.key}>{ch.label}</option>)}
            </select>
            <button onClick={() => remove(i)} className="btn btn-ghost" style={{ padding: '0 14px', fontSize: '18px', lineHeight: 1 }}>×</button>
          </div>
        ))}
        <button onClick={add} className="btn btn-ghost" style={{ alignSelf: 'flex-start' }}>+ Add contract</button>
      </div>

      <button
        onClick={scan}
        disabled={!canScan}
        className="btn btn-primary"
        style={{ alignSelf: 'flex-start', padding: '8px 20px', fontSize: '14px', opacity: canScan ? 1 : 0.35 }}
      >
        {scanning ? 'Scanning…' : 'Scan Contracts'}
      </button>

      {logs.length > 0 && (
        <div style={{ flex: 1, background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '12px', overflowY: 'auto', fontSize: '12px', lineHeight: '1.8', color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
          {logs.map((l, i) => <div key={i}>{l}</div>)}
          <div ref={logEndRef} />
        </div>
      )}
    </div>
  )
}

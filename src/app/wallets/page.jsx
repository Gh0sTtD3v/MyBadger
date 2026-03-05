'use client'

import { useEffect, useRef, useState } from 'react'
import { useConfig } from '../../context/ConfigContext'

const CHAINS = [
  { key: 'eth',      label: 'Ethereum' },
  { key: 'base',     label: 'Base' },
  { key: 'arbitrum', label: 'Arbitrum' },
  { key: 'optimism', label: 'Optimism' },
  { key: 'apechain', label: 'ApeChain' },
  { key: 'bnb',      label: 'BNB Chain' },
  { key: 'solana',   label: 'Solana' },
  { key: 'tezos',    label: 'Tezos' },
  { key: 'btc',      label: 'Bitcoin' },
  { key: 'xcp',      label: 'Counterparty' },
  { key: 'xrpl',     label: 'XRP Ledger' },
]

const empty = () => ({ address: '', chains: ['eth'] })

export default function Wallets() {
  const { apiKey, wallets, setWallets } = useConfig()
  const [scanning, setScanning] = useState(false)
  const [logs,     setLogs]     = useState([])
  const [rawCount, setRawCount] = useState(null)
  const logEndRef = useRef(null)

  useEffect(() => {
    if (!window.electron) return
    window.electron.raw.count().then(setRawCount)
  }, [])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  async function scanWallets() {
    if (!window.electron || !apiKey.trim()) return
    const valid = wallets.filter(w => w.address?.trim() && w.chains?.length)
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

    await window.electron.raw.clear()
    await window.electron.runAlchemy(apiKey.trim(), valid.map(w => ({ address: w.address.trim(), chains: w.chains })))
  }

  function setAddress(i, address) {
    setWallets(prev => prev.map((w, idx) => idx === i ? { ...w, address } : w))
  }

  function toggleChain(i, key) {
    setWallets(prev => prev.map((w, idx) => {
      if (idx !== i) return w
      const chains = w.chains.includes(key) ? w.chains.filter(c => c !== key) : [...w.chains, key]
      return { ...w, chains }
    }))
  }

  function add()     { setWallets(prev => [...prev, empty()]) }
  function remove(i) { setWallets(prev => prev.length === 1 ? [empty()] : prev.filter((_, idx) => idx !== i)) }

  const canScan = !scanning && apiKey.trim() && wallets.some(w => w.address.trim() && w.chains.length)

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontSize: '14px', color: '#a3e635' }}>Wallets</h2>
        {rawCount !== null && (
          <span style={{ fontSize: '11px', color: '#444' }}>{rawCount} NFTs in raw index</span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '560px' }}>
        {wallets.map((w, i) => (
          <div key={i} style={{ background: '#0d0d0d', border: '1px solid #1c1c1c', borderRadius: '6px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                placeholder="wallet address..."
                value={w.address}
                onChange={e => setAddress(i, e.target.value)}
                style={inputStyle}
              />
              <button onClick={() => remove(i)} style={removeBtnStyle}>×</button>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {CHAINS.map(({ key, label }) => (
                <label key={key} style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  cursor: 'pointer', fontSize: '11px',
                  color: w.chains.includes(key) ? '#e5e5e5' : '#444',
                }}>
                  <input
                    type="checkbox"
                    checked={w.chains.includes(key)}
                    onChange={() => toggleChain(i, key)}
                    style={{ accentColor: '#a3e635', cursor: 'pointer' }}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        ))}
        <button onClick={add} style={addBtnStyle}>+ Add wallet</button>
      </div>

      <button
        onClick={scanWallets}
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
        {scanning ? 'Scanning...' : 'Scan Wallets'}
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

const inputStyle     = { flex: 1, padding: '7px 10px', background: '#111', border: '1px solid #222', borderRadius: '4px', color: '#e5e5e5', fontSize: '12px', fontFamily: 'monospace', outline: 'none' }
const removeBtnStyle = { padding: '0 12px', background: '#111', border: '1px solid #222', borderRadius: '4px', color: '#555', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }
const addBtnStyle    = { alignSelf: 'flex-start', padding: '5px 12px', background: 'transparent', border: '1px solid #222', borderRadius: '4px', color: '#555', cursor: 'pointer', fontSize: '11px', fontFamily: 'monospace' }

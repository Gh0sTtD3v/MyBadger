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
        <h2 className="page-title">Wallets</h2>
        {rawCount !== null && (
          <span style={{ fontSize: '12px', color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>{rawCount} NFTs indexed</span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '560px' }}>
        {wallets.map((w, i) => (
          <div key={i} style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                placeholder="wallet address…"
                value={w.address}
                onChange={e => setAddress(i, e.target.value)}
                className="input"
                style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '13px' }}
              />
              <button onClick={() => remove(i)} className="btn btn-ghost" style={{ padding: '0 14px', fontSize: '18px', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {CHAINS.map(({ key, label }) => (
                <label key={key} style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  cursor: 'pointer', fontSize: '13px',
                  color: w.chains.includes(key) ? 'var(--text)' : 'var(--text-3)',
                  transition: 'color var(--ease)',
                }}>
                  <input
                    type="checkbox"
                    checked={w.chains.includes(key)}
                    onChange={() => toggleChain(i, key)}
                    style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        ))}
        <button onClick={add} className="btn btn-ghost" style={{ alignSelf: 'flex-start' }}>+ Add wallet</button>
      </div>

      <button
        onClick={scanWallets}
        disabled={!canScan}
        className="btn btn-primary"
        style={{ alignSelf: 'flex-start', padding: '8px 20px', fontSize: '14px', opacity: canScan ? 1 : 0.35 }}
      >
        {scanning ? 'Scanning…' : 'Scan Wallets'}
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

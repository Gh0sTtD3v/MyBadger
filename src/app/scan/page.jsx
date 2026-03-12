'use client'

import { useEffect, useRef, useState } from 'react'
import { useConfig } from '../../context/ConfigContext'
import { useSources } from '../../context/SourcesContext'

const WALLET_CHAINS = [
  { key: 'eth',      label: 'Ethereum'     },
  { key: 'base',     label: 'Base'         },
  { key: 'arbitrum', label: 'Arbitrum'     },
  { key: 'optimism', label: 'Optimism'     },
  { key: 'apechain', label: 'ApeChain'     },
  { key: 'bnb',      label: 'BNB Chain'    },
  { key: 'solana',   label: 'Solana'       },
  { key: 'tezos',    label: 'Tezos'        },
  { key: 'btc',      label: 'Bitcoin'      },
  { key: 'xcp',      label: 'Counterparty' },
  { key: 'xrpl',     label: 'XRP Ledger'   },
]

const CONTRACT_CHAINS = [
  { key: 'eth',      label: 'Ethereum' },
  { key: 'base',     label: 'Base'     },
  { key: 'arbitrum', label: 'Arbitrum' },
  { key: 'optimism', label: 'Optimism' },
  { key: 'apechain', label: 'ApeChain' },
]

export default function Sources() {
  const { apiKey, unisatKey } = useConfig()
  const { sources, setSources, newSource } = useSources()
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

  function patch(id, changes) {
    setSources(prev => prev.map(s => s.id === id ? { ...s, ...changes } : s))
  }

  function toggleChain(id, key) {
    setSources(prev => prev.map(s => {
      if (s.id !== id) return s
      const chains = s.chains.includes(key) ? s.chains.filter(c => c !== key) : [...s.chains, key]
      return { ...s, chains }
    }))
  }

  function add() {
    setSources(prev => [...prev, newSource()])
  }

  function remove(id) {
    setSources(prev => prev.length === 1 ? [newSource()] : prev.filter(s => s.id !== id))
  }

  async function scan() {
    if (!window.electron || !apiKey.trim()) return
    const enabled   = sources.filter(s => s.enabled && s.address.trim())
    if (!enabled.length) return
    const wallets   = enabled.filter(s => s.type === 'wallet').map(s => ({ address: s.address.trim(), chains: s.chains }))
    const contracts = enabled.filter(s => s.type === 'contract').map(s => ({ address: s.address.trim(), chain: s.chain }))

    setScanning(true)
    setLogs([])
    await window.electron.raw.clear()

    function runWithEvents(fn) {
      return new Promise((resolve, reject) => {
        window.electron.onEvent(payload => {
          if (payload.message) setLogs(prev => [...prev, payload.message])
          if (payload.type === 'done')  { window.electron.removeListeners(); resolve() }
          if (payload.type === 'error') { window.electron.removeListeners(); reject(new Error(payload.message)) }
        })
        fn()
      })
    }

    try {
      if (wallets.length)   await runWithEvents(() => window.electron.runAlchemy(apiKey.trim(), unisatKey.trim(), wallets))
      if (contracts.length) await runWithEvents(() => window.electron.runContract(apiKey.trim(), contracts))
    } catch (err) {
      setLogs(prev => [...prev, `Error: ${err.message}`])
    }

    window.electron.raw.count().then(setRawCount)
    setScanning(false)
  }

  const canScan = !scanning && apiKey.trim() && sources.some(s => s.enabled && s.address.trim())

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 className="page-title">Scan</h2>
        {rawCount !== null && (
          <span style={{ fontSize: '12px', color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>{rawCount} NFTs indexed</span>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '680px' }}>
        {sources.map(s => (
          <SourceEntry
            key={s.id}
            source={s}
            onPatch={changes => patch(s.id, changes)}
            onToggleChain={key => toggleChain(s.id, key)}
            onRemove={() => remove(s.id)}
          />
        ))}
        <button onClick={add} className="btn btn-ghost" style={{ alignSelf: 'flex-start', marginTop: '2px' }}>+ Add source</button>
      </div>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button
          onClick={scan}
          disabled={!canScan}
          className="btn btn-primary"
          style={{ padding: '8px 20px', fontSize: '14px', opacity: canScan ? 1 : 0.35 }}
        >
          {scanning ? 'Scanning…' : 'Scan'}
        </button>
      </div>

      {logs.length > 0 && (
        <div style={{ maxHeight: '200px', background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '12px', overflowY: 'auto', fontSize: '12px', lineHeight: '1.8', color: 'var(--text-2)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
          {logs.map((l, i) => <div key={i}>{l}</div>)}
          <div ref={logEndRef} />
        </div>
      )}

    </div>
  )
}

function SourceEntry({ source, onPatch, onToggleChain, onRemove }) {
  return (
    <div style={{
      background: 'var(--bg-1)',
      border: `1px solid ${source.enabled ? 'var(--border)' : 'var(--bg-3)'}`,
      borderRadius: 'var(--r2)',
      padding: '10px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      opacity: source.enabled ? 1 : 0.45,
      transition: 'opacity var(--ease), border-color var(--ease)',
    }}>

      {/* Row 1: enable + name + type toggle + delete */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          type="checkbox"
          checked={source.enabled}
          onChange={e => onPatch({ enabled: e.target.checked })}
          style={{ accentColor: 'var(--accent)', cursor: 'pointer', flexShrink: 0 }}
          title="Include in scan"
        />
        <input
          type="text"
          placeholder="Name / nickname"
          value={source.name}
          onChange={e => onPatch({ name: e.target.value })}
          className="input"
          style={{ flex: 1, fontSize: '13px' }}
        />
        <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--r1)', overflow: 'hidden', flexShrink: 0 }}>
          {['wallet', 'contract'].map(t => (
            <button key={t} onClick={() => onPatch({ type: t })} style={{
              padding: '4px 10px',
              fontSize: '11px',
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              border: 'none',
              background: source.type === t ? 'var(--accent-lo)' : 'transparent',
              color: source.type === t ? 'var(--accent)' : 'var(--text-4)',
              transition: 'all var(--ease)',
            }}>{t}</button>
          ))}
        </div>
        <button onClick={onRemove} className="btn btn-ghost" style={{ padding: '0 12px', fontSize: '18px', lineHeight: 1, flexShrink: 0 }}>×</button>
      </div>

      {/* Row 2: address */}
      <input
        type="text"
        placeholder={source.type === 'wallet' ? 'wallet address…' : '0x contract address…'}
        value={source.address}
        onChange={e => onPatch({ address: e.target.value })}
        className="input"
        style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
      />

      {/* Row 3: chains */}
      {source.type === 'wallet' ? (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {WALLET_CHAINS.map(({ key, label }) => (
            <label key={key} style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              cursor: 'pointer', fontSize: '13px',
              color: source.chains.includes(key) ? 'var(--text)' : 'var(--text-3)',
              transition: 'color var(--ease)',
            }}>
              <input
                type="checkbox"
                checked={source.chains.includes(key)}
                onChange={() => onToggleChain(key)}
                style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
              />
              {label}
            </label>
          ))}
        </div>
      ) : (
        <select
          value={source.chain}
          onChange={e => onPatch({ chain: e.target.value })}
          className="input"
          style={{ fontSize: '13px', alignSelf: 'flex-start' }}
        >
          {CONTRACT_CHAINS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      )}

    </div>
  )
}

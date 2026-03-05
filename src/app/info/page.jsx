'use client'

import { useState } from 'react'
import pkg from '../../../package.json'

const DONATIONS = [
  { chain: 'Ethereum', address: '0x0000000000000000000000000000000000000000' },
  { chain: 'Solana',   address: 'So11111111111111111111111111111111111111112' },
]

export default function Info() {
  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', fontSize: '12px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h2 style={{ margin: 0, fontSize: '14px', color: '#a3e635' }}>About</h2>
        <Row label="Name"    value={pkg.name} />
        <Row label="Version" value={pkg.version} />
        <Row label="Author"  value={pkg.author ?? '—'} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h2 style={{ margin: 0, fontSize: '14px', color: '#a3e635' }}>Donate</h2>
        <p style={{ margin: 0, color: '#444', fontSize: '11px' }}>If this tool helped you, consider buying me a coffee.</p>
        {DONATIONS.map(({ chain, address }) => (
          <DonationRow key={chain} chain={chain} address={address} />
        ))}
      </div>
    </div>
  )
}

function DonationRow({ chain, address }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span style={{ color: '#555', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{chain}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: '#ccc', fontFamily: 'monospace', fontSize: '11px', wordBreak: 'break-all' }}>{address}</span>
        <button onClick={copy} style={{
          flexShrink: 0,
          padding: '3px 10px',
          background: copied ? '#1a3a00' : '#111',
          border: `1px solid ${copied ? '#4a7a10' : '#222'}`,
          borderRadius: '4px',
          color: copied ? '#a3e635' : '#555',
          fontSize: '10px',
          fontFamily: 'monospace',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}>
          {copied ? 'copied' : 'copy'}
        </button>
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: '16px' }}>
      <span style={{ color: '#444', width: '64px' }}>{label}</span>
      <span style={{ color: '#ccc' }}>{value}</span>
    </div>
  )
}

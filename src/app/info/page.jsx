'use client'

import { useState } from 'react'
import pkg from '../../../package.json'

const DONATIONS = [
  { chain: 'Ethereum', address: '0x0000000000000000000000000000000000000000' },
  { chain: 'Solana',   address: 'So11111111111111111111111111111111111111112' },
]

export default function Info() {
  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 className="page-title">About</h2>
        <Row label="Name"    value={pkg.name} />
        <Row label="Version" value={pkg.version} />
        <Row label="Author"  value={pkg.author ?? '—'} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 className="page-title">Donate</h2>
        <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '14px' }}>If this tool helped you, consider buying me a coffee.</p>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <span className="section-label">{chain}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: 'var(--text-2)', fontFamily: 'var(--font-mono)', fontSize: '13px', wordBreak: 'break-all' }}>{address}</span>
        <button onClick={copy} className="btn btn-ghost" style={{
          flexShrink: 0,
          padding: '4px 12px',
          fontSize: '12px',
          color: copied ? 'var(--accent)' : 'var(--text-3)',
          borderColor: copied ? 'var(--accent-bdr)' : 'var(--border)',
          transition: 'all var(--ease)',
        }}>
          {copied ? 'copied' : 'copy'}
        </button>
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: '20px', alignItems: 'baseline' }}>
      <span className="section-label" style={{ width: '60px', flexShrink: 0 }}>{label}</span>
      <span style={{ color: 'var(--text-2)', fontSize: '14px' }}>{value}</span>
    </div>
  )
}

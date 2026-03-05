'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCurations } from '../context/CurationsContext'

const W_CLOSED = 52
const W_OPEN   = 200

export default function NavBar() {
  const [open, setOpen] = useState(false)
  const pathname        = usePathname()
  const navRef          = useRef(null)
  const { curations }   = useCurations()

  useEffect(() => {
    if (!open) return
    function onMouseDown(e) {
      if (navRef.current && !navRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  return (
    <nav ref={navRef} onClick={() => setOpen(o => !o)} style={{
      width: open ? W_OPEN : W_CLOSED,
      minWidth: open ? W_OPEN : W_CLOSED,
      height: '100vh',
      background: '#0d0d0d',
      borderRight: '1px solid #1c1c1c',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1), min-width 0.22s cubic-bezier(0.4,0,0.2,1)',
      flexShrink: 0,
      userSelect: 'none',
      cursor: 'pointer',
    }}>

      {/* Hamburger */}
      <button style={triggerStyle} title="Menu">
        <HamburgerIcon />
        <span style={labelStyle(open)}>Menu</span>
      </button>

      {/* Curations list */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingTop: '2px', overflowY: 'auto' }}>
        {curations.length === 0 && (
          <span style={{
            padding: '5px 14px 5px 34px',
            fontSize: '11px',
            opacity: open ? 1 : 0,
            maxHeight: open ? '32px' : '0px',
            overflow: 'hidden',
            color: '#2a2a2a',
            transition: 'max-height 0.22s cubic-bezier(0.4,0,0.2,1), opacity 0.18s ease',
          }}>
            no curations
          </span>
        )}
        {curations.map(c => (
          <SubLink key={c._id} href={`/gallery/${c._id}`} label={c.name} active={pathname === `/gallery/${c._id}`} open={open} />
        ))}
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: '#1c1c1c', margin: '0 14px' }} />

      {/* Bottom icon links */}
      <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: '8px', paddingTop: '4px' }}>
        <NavIconLink href="/indexer" label="Indexer" active={pathname === '/indexer'} open={open}>
          <IndexerIcon />
        </NavIconLink>
        <NavIconLink href="/ipfs" label="IPFS" active={pathname === '/ipfs'} open={open}>
          <IpfsIcon />
        </NavIconLink>
        <NavIconLink href="/wallets" label="Wallets" active={pathname === '/wallets'} open={open}>
          <WalletIcon />
        </NavIconLink>
        <NavIconLink href="/contracts" label="Contracts" active={pathname === '/contracts'} open={open}>
          <ContractIcon />
        </NavIconLink>
        <NavIconLink href="/config" label="Config" active={pathname === '/config'} open={open}>
          <AlchemyIcon />
        </NavIconLink>
        <NavIconLink href="/info" label="Info" active={pathname === '/info'} open={open}>
          <InfoIcon />
        </NavIconLink>
      </div>

    </nav>
  )
}

function SubLink({ href, label, active, open }) {
  return (
    <Link href={href} style={{
      display: 'block',
      padding: '5px 14px 5px 34px',
      color: active ? '#a3e635' : '#3a3a3a',
      textDecoration: 'none',
      fontSize: '12px',
      whiteSpace: 'nowrap',
      opacity: open ? 1 : 0,
      maxHeight: open ? '32px' : '0px',
      overflow: 'hidden',
      transition: 'max-height 0.22s cubic-bezier(0.4,0,0.2,1), opacity 0.18s ease, color 0.15s ease',
      pointerEvents: open ? 'auto' : 'none',
      letterSpacing: '0.02em',
    }}>
      {label}
    </Link>
  )
}

function NavIconLink({ href, label, active, open, children }) {
  return (
    <Link href={href} style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '9px 0 9px 17px',
      color: active ? '#a3e635' : '#555',
      textDecoration: 'none',
      whiteSpace: 'nowrap',
      transition: 'color 0.15s ease',
    }}>
      {children}
      <span style={{
        fontSize: '11px',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: active ? '#a3e635' : '#444',
        opacity: open ? 1 : 0,
        maxWidth: open ? '150px' : '0px',
        overflow: 'hidden',
        transition: 'max-width 0.22s cubic-bezier(0.4,0,0.2,1), opacity 0.18s ease',
      }}>
        {label}
      </span>
    </Link>
  )
}

const triggerStyle = {
  display: 'flex', alignItems: 'center', gap: '12px',
  padding: '12px 0 12px 17px',
  color: '#555', background: 'none', border: 'none',
  cursor: 'pointer', width: '100%', textAlign: 'left', whiteSpace: 'nowrap',
}

function labelStyle(open) {
  return {
    fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase',
    color: '#444',
    opacity: open ? 1 : 0,
    maxWidth: open ? '150px' : '0px',
    overflow: 'hidden',
    transition: 'max-width 0.22s cubic-bezier(0.4,0,0.2,1), opacity 0.18s ease',
    pointerEvents: 'none',
  }
}

function HamburgerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" style={{ flexShrink: 0 }}>
      <rect x="2" y="3.5"  width="14" height="1.5" rx="0.75" />
      <rect x="2" y="8.25" width="14" height="1.5" rx="0.75" />
      <rect x="2" y="13"   width="14" height="1.5" rx="0.75" />
    </svg>
  )
}

function IndexerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
      <rect x="2" y="2" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="10" y="2" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="2" y="10" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="10" y="10" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

function WalletIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
      <rect x="2" y="5.5" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2 9h14" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="12.5" cy="12" r="1" fill="currentColor" />
      <path d="M6 5.5V4.5a2 2 0 014 0v1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function ContractIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
      <rect x="3" y="2" width="12" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <line x1="6" y1="6"  x2="12" y2="6"  stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="6" y1="9"  x2="12" y2="9"  stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="6" y1="12" x2="10" y2="12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function AlchemyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
      <path d="M7 2h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M7.5 2v4.5L4 13.5a2 2 0 001.8 2.5h6.4a2 2 0 001.8-2.5L10.5 6.5V2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="8"  cy="12.5" r="0.9" fill="currentColor" />
      <circle cx="11" cy="14"   r="0.6" fill="currentColor" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9 8v5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="9" cy="5.5" r="0.9" fill="currentColor" />
    </svg>
  )
}

function IpfsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
      <path d="M9 3 L14.2 6 L9 9 L3.8 6 Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M3.8 6 L9 9 L9 15 L3.8 12 Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M9 9 L14.2 6 L14.2 12 L9 15 Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  )
}

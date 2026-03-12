'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCurations } from '../context/CurationsContext'

const W_CLOSED = 52
const W_OPEN   = 210

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
    <nav ref={navRef} style={{
      width: open ? W_OPEN : W_CLOSED,
      minWidth: open ? W_OPEN : W_CLOSED,
      height: '100vh',
      background: 'var(--bg-1)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      transition: `width var(--slide), min-width var(--slide)`,
      flexShrink: 0,
      userSelect: 'none',
    }}>

      {/* Hamburger */}
      <button
        title="Menu"
        aria-label="Toggle menu"
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '14px 0 14px 17px',
          color: open ? 'var(--text-2)' : 'var(--text-3)',
          background: 'none', border: 'none',
          cursor: 'pointer', width: '100%',
          textAlign: 'left', whiteSpace: 'nowrap', flexShrink: 0,
          transition: 'color var(--ease)',
        }}
      >
        <HamburgerIcon />
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '11px', fontWeight: 700,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'var(--text-3)',
          opacity: open ? 1 : 0,
          maxWidth: open ? '140px' : '0px',
          overflow: 'hidden',
          transition: `max-width var(--slide), opacity var(--ease)`,
          pointerEvents: 'none',
        }}>Menu</span>
      </button>

      {/* Curations header */}
      <div style={{
        padding: '10px 14px 4px 18px',
        marginBottom: '4px',
        opacity: open ? 1 : 0,
        maxHeight: open ? '28px' : '0px',
        overflow: 'hidden',
        transition: `max-height var(--slide), opacity var(--ease)`,
        pointerEvents: 'none',
      }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--text-4)',
          whiteSpace: 'nowrap',
        }}>Curations</span>
      </div>

      {/* Curations list */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingTop: '2px', overflowY: 'auto', marginLeft: '24px' }}>
        {curations.length === 0 && (
          <span style={{
            padding: '5px 14px 5px 34px',
            fontSize: '12px',
            opacity: open ? 1 : 0,
            maxHeight: open ? '32px' : '0px',
            overflow: 'hidden',
            color: 'var(--text-4)',
            transition: `max-height var(--slide), opacity var(--ease)`,
          }}>
            no curations
          </span>
        )}
        {curations.map(c => (
          <SubLink
            key={c._id}
            href={`/gallery/${c._id}`}
            label={c.name}
            active={pathname === `/gallery/${c._id}`}
            open={open}
            onClick={() => setOpen(true)}
          />
        ))}
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'var(--border)', margin: '0 12px' }} />

      {/* Bottom icon links */}
      <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: '10px', paddingTop: '4px' }}>
        <NavIconLink href="/indexer" label="Curate"  active={pathname === '/indexer'} open={open} onClick={() => setOpen(true)}><IndexerIcon /></NavIconLink>
        <NavIconLink href="/ipfs"    label="IPFS"    active={pathname === '/ipfs'}    open={open} onClick={() => setOpen(true)}><IpfsIcon /></NavIconLink>
        <NavIconLink href="/scan" label="Scan" active={pathname === '/scan'} open={open} onClick={() => setOpen(true)}><SourcesIcon /></NavIconLink>
        <NavIconLink href="/config"  label="Config"  active={pathname === '/config'}  open={open} onClick={() => setOpen(true)}><AlchemyIcon /></NavIconLink>
        <NavIconLink href="/info"    label="Info"    active={pathname === '/info'}    open={open} onClick={() => setOpen(true)}><InfoIcon /></NavIconLink>
        <NavIconLink href="/dev"     label="Dev"     active={pathname === '/dev'}     open={open} onClick={() => setOpen(true)}><DevIcon /></NavIconLink>
      </div>

    </nav>
  )
}

function SubLink({ href, label, active, open, onClick }) {
  return (
    <Link href={href} style={{
      display: 'block',
      padding: '5px 14px 5px 18px',
      marginLeft: '10px',
      color: active ? 'var(--accent)' : 'var(--text-3)',
      textDecoration: 'none',
      fontSize: '13px',
      fontWeight: active ? 500 : 400,
      whiteSpace: 'nowrap',
      opacity: open ? 1 : 0,
      maxHeight: open ? '32px' : '0px',
      overflow: 'hidden',
      transition: `max-height var(--slide), opacity var(--ease), color var(--ease)`,
      pointerEvents: open ? 'auto' : 'none',
      letterSpacing: '0.01em',
      background: active ? 'var(--accent-xlo)' : 'transparent',
      borderLeft: `2px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
      marginLeft: '1px',
    }} onClick={onClick}>
      {label}
    </Link>
  )
}

function NavIconLink({ href, label, active, open, children, onClick }) {
  return (
    <Link href={href} style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '9px 0 9px 16px',
      color: active ? 'var(--accent)' : 'var(--text-3)',
      textDecoration: 'none',
      whiteSpace: 'nowrap',
      transition: `color var(--ease)`,
      borderLeft: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
      background: active ? 'var(--accent-xlo)' : 'transparent',
      marginLeft: '1px',
    }} onClick={onClick}>
      {children}
      <span style={{
        fontFamily: 'var(--font-display)',
        fontSize: '11px',
        fontWeight: active ? 700 : 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: active ? 'var(--accent)' : 'var(--text-3)',
        opacity: open ? 1 : 0,
        maxWidth: open ? '140px' : '0px',
        overflow: 'hidden',
        transition: `max-width var(--slide), opacity var(--ease)`,
      }}>
        {label}
      </span>
    </Link>
  )
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

function SourcesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
      <rect x="2" y="3" width="14" height="3" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="2" y="8" width="14" height="3" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="2" y="13" width="8" height="3" rx="1" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}

function DevIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
      <polyline points="4,6 2,9 4,12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="14,6 16,9 14,12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="11" y1="4" x2="7" y2="14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

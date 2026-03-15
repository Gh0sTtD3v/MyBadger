'use client'

import { useEffect, useState } from 'react'
import { useConfig } from '../../context/ConfigContext'

export default function Config() {
  const { apiKey, setApiKey, unisatKey, setUnisatKey } = useConfig()
  const [mediaDir,    setMediaDir]    = useState('')
  const [llmDir,      setLlmDir]      = useState('')
  const [ipfsStatus,    setIpfsStatus]    = useState(null)
  const [ipfsAutoStart, setIpfsAutoStart] = useState(false)
  const [llmStatus,     setLlmStatus]     = useState(null)
  const [llmProgress,   setLlmProgress]   = useState(null)

  useEffect(() => {
    if (!window.electron) return
    window.electron.settings.getMediaDir().then(setMediaDir)
    window.electron.llm.getModelsDir().then(d => setLlmDir(d || ''))
    window.electron.ipfs.status().then(setIpfsStatus)
    window.electron.ipfs.getAutoStart().then(setIpfsAutoStart)
    window.electron.llm.status().then(setLlmStatus)
  }, [])

  async function toggleIpfsAutoStart(val) {
    setIpfsAutoStart(val)
    await window.electron.ipfs.setAutoStart(val)
  }

  async function downloadModel() {
    if (!window.electron) return
    setLlmProgress({ downloaded: 0, total: 0 })
    window.electron.llm.onEvent(p => setLlmProgress(p))
    const result = await window.electron.llm.download()
    window.electron.llm.removeListeners()
    if (result.ok) {
      setLlmProgress(null)
      window.electron.llm.status().then(setLlmStatus)
    } else {
      setLlmProgress({ error: result.error })
    }
  }

  async function browseFolder() {
    const selected = await window.electron.settings.selectFolder()
    if (!selected) return
    await window.electron.settings.setMediaDir(selected)
    setMediaDir(selected)
  }

  async function browseLlmFolder() {
    const selected = await window.electron.settings.selectFolder()
    if (!selected) return
    await window.electron.llm.setModelsDir(selected)
    setLlmDir(selected)
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-10 py-8 w-full max-w-3xl flex flex-col gap-10">

        {/* Page header */}
        <div className="flex flex-col gap-1">
          <h2 className="page-title">Config</h2>
          <p className="text-[13px] text-text-3 font-ui">
            Manage API credentials, local storage paths, and service connections.
          </p>
        </div>

        {/* ── API Keys ────────────────────────────────────── */}
        <Section title="API Keys" icon={<KeyIcon />}>
          <Field
            label="Alchemy API Key"
            desc="Used for EVM chain indexing and NFT metadata resolution."
            guide={{ label: 'How to get an API key', href: 'https://www.alchemy.com/docs/create-an-api-key' }}
          >
            <input
              type="password"
              placeholder="alchemy_…"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              className="input w-full font-mono"
            />
          </Field>

          <Field
            label="UniSat API Key"
            desc="Required for Bitcoin Ordinals indexing and inscription lookups."
            guide={{ label: 'How to get an API key', href: 'https://docs.unisat.io/developer-support/how-to-acquire-a-unisat-api-key' }}
          >
            <input
              type="password"
              placeholder="unisat_…"
              value={unisatKey}
              onChange={e => setUnisatKey(e.target.value)}
              className="input w-full font-mono"
            />
          </Field>
        </Section>

        {/* ── Media ───────────────────────────────────────── */}
        <Section title="Media" icon={<FolderIcon />}>
          <Field
            label="Media Folder"
            desc="Where downloaded NFT images, video, and audio assets are stored locally."
          >
            <PathRow
              value={mediaDir}
              placeholder="default"
              onBrowse={browseFolder}
            />
          </Field>
        </Section>

        {/* ── AI Model ────────────────────────────────────── */}
        <Section title="AI Model" icon={<ModelIcon />}>
          <Field
            label="Model Folder"
            desc="Storage location for downloaded model weights. Defaults to userData/models."
          >
            <PathRow
              value={llmDir}
              placeholder="default (userData/models)"
              onBrowse={browseLlmFolder}
            />
          </Field>

          <Field
            label="Phi-3.5 Mini"
            desc="~2 GB quantised model used for on-device AI tagging and search."
          >
            <ModelStatus status={llmStatus} progress={llmProgress} onDownload={downloadModel} />
          </Field>
        </Section>

        {/* ── IPFS ────────────────────────────────────────── */}
        <Section title="IPFS" icon={<IpfsIcon />}>
          <Field
            label="Node"
            desc="Local IPFS daemon used to resolve and pin decentralised content."
          >
            <IpfsStatus status={ipfsStatus} />
          </Field>
          <Field
            label="Start on launch"
            desc="Automatically start the IPFS node on app startup (3s delay)."
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={ipfsAutoStart}
                onChange={e => toggleIpfsAutoStart(e.target.checked)}
                style={{ accentColor: 'var(--accent)', width: '14px', height: '14px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '13px', color: 'var(--text-2)' }}>{ipfsAutoStart ? 'Enabled' : 'Disabled'}</span>
            </label>
          </Field>
        </Section>

      </div>
    </div>
  )
}

/* ─── Section ─────────────────────────────────────────────────── */

function Section({ title, icon, children }) {
  return (
    <div className="flex flex-col gap-6">
      {/* Header row */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-accent opacity-60">{icon}</span>
          <span className="section-label tracking-widest">{title}</span>
        </div>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Card */}
      <div className="rounded-[var(--r3)] border border-border bg-bg-1 divide-y divide-border">
        {children}
      </div>
    </div>
  )
}

/* ─── Field ───────────────────────────────────────────────────── */

function Field({ label, desc, guide, children }) {
  return (
    <div className="flex flex-col gap-4 px-5 py-5">
      {/* Label + optional guide */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-4">
          <label className="text-[11px] font-display uppercase tracking-widest text-text-2">
            {label}
          </label>
          {guide && <GuideLink href={guide.href} label={guide.label} />}
        </div>
        {desc && (
          <p className="text-[12px] text-text-3 font-ui leading-relaxed">{desc}</p>
        )}
      </div>
      {children}
    </div>
  )
}

/* ─── PathRow ─────────────────────────────────────────────────── */

function PathRow({ value, placeholder, onBrowse }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={[
          'input flex-1 text-[13px] overflow-hidden text-ellipsis whitespace-nowrap',
          value ? 'text-text-2 font-mono' : 'text-text-4 font-ui',
        ].join(' ')}
      >
        {value || placeholder}
      </div>
      <button onClick={onBrowse} className="btn btn-ghost shrink-0">
        Browse
      </button>
    </div>
  )
}

/* ─── ModelStatus ─────────────────────────────────────────────── */

function ModelStatus({ status, progress, onDownload }) {
  if (status === null) {
    return <StatusRow dot="muted" label="loading…" />
  }

  if (status.ready) {
    return <StatusRow dot="green" label="ready" badge="active" />
  }

  if (status.downloaded) {
    return <StatusRow dot="blue" label="downloaded · loading…" />
  }

  // Not downloaded
  return (
    <div className="flex flex-col gap-3">
      <StatusRow dot="muted" label="not downloaded" />

      {progress ? (
        progress.error ? (
          <p className="text-[12px] text-red font-mono break-all">{progress.error}</p>
        ) : progress.total > 0 ? (
          <div className="flex flex-col gap-2">
            {/* Progress bar */}
            <div className="h-[3px] rounded-full bg-bg-3 overflow-hidden">
              <div
                className="h-full bg-blue rounded-full transition-[width] duration-300 ease-out"
                style={{ width: `${(progress.downloaded / progress.total) * 100}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-text-4 font-mono tabular-nums">
                {(progress.downloaded / 1e6).toFixed(0)} MB
                <span className="text-text-4 opacity-50 mx-1">/</span>
                {(progress.total / 1e6).toFixed(0)} MB
              </span>
              <span className="text-[11px] text-blue font-mono tabular-nums">
                {((progress.downloaded / progress.total) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        ) : (
          <StatusRow dot="blue" label="connecting…" />
        )
      ) : (
        <button onClick={onDownload} className="btn btn-ghost self-start">
          Download model
        </button>
      )}
    </div>
  )
}

/* ─── IpfsStatus ──────────────────────────────────────────────── */

function IpfsStatus({ status }) {
  if (status === null) {
    return <StatusRow dot="muted" label="loading…" />
  }

  if (status.running) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <StatusRow dot="green" label="running" />
          <span className="badge badge-green text-[10px]">{status.peers} peers</span>
        </div>
        <div className="rounded-[var(--r2)] bg-bg-2 border border-border px-3 py-2">
          <p className="text-[11px] text-text-4 font-mono break-all leading-relaxed">
            {status.peerId}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <StatusRow dot="red" label="offline" />
      {status.error && (
        <p className="text-[12px] text-text-4 font-mono ml-4">{status.error}</p>
      )}
    </div>
  )
}

/* ─── StatusRow ───────────────────────────────────────────────── */

const dotColors = {
  green: 'bg-accent shadow-[0_0_6px_var(--accent)]',
  blue:  'bg-blue  shadow-[0_0_6px_var(--blue)]',
  red:   'bg-red   shadow-[0_0_6px_var(--red)]',
  muted: 'bg-[var(--text-3)]',
}

const labelColors = {
  green: 'text-accent',
  blue:  'text-blue',
  red:   'text-red',
  muted: 'text-text-3',
}

function StatusRow({ dot, label }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-[6px] h-[6px] rounded-full shrink-0 ${dotColors[dot] ?? dotColors.muted}`} />
      <span className={`text-[13px] font-ui ${labelColors[dot] ?? labelColors.muted}`}>{label}</span>
    </div>
  )
}

/* ─── GuideLink ───────────────────────────────────────────────── */

function GuideLink({ href, label }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-1 items-end">
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="text-[11px] text-text-4 hover:text-accent border-b border-border hover:border-accent transition-colors duration-150 self-end leading-none pb-px"
      >
        {label} ↗
      </a>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-text-4 opacity-60 font-ui">or visit:</span>
        <div className="relative group">
          <button
            onClick={copy}
            className={[
              'text-[10px] font-mono cursor-pointer bg-transparent border-0 p-0 text-left transition-colors duration-150 hover:underline decoration-dotted',
              copied ? 'text-accent' : 'text-text-4 hover:text-text-3',
            ].join(' ')}
          >
            {copied ? 'copied!' : href}
          </button>
          {!copied && (
            <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-[10px] font-ui bg-bg-3 border border-border text-text-2 px-1.5 py-0.5 rounded whitespace-nowrap">
              copy
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Icons ───────────────────────────────────────────────────── */

function KeyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="10" r="3.5" />
      <path d="M8.5 7.5L14 2" />
      <path d="M12 4l1.5 1.5" />
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 4.5h13v8a1 1 0 01-1 1h-11a1 1 0 01-1-1v-8z" />
      <path d="M1.5 4.5l1.5-2h4l1.5 2" />
    </svg>
  )
}

function ModelIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="5" height="5" rx="1" />
      <rect x="9" y="2" width="5" height="5" rx="1" />
      <rect x="2" y="9" width="5" height="5" rx="1" />
      <rect x="9" y="9" width="5" height="5" rx="1" />
    </svg>
  )
}

function IpfsIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="8,1.5 14.5,5 14.5,11 8,14.5 1.5,11 1.5,5" />
      <line x1="8" y1="1.5" x2="8" y2="14.5" />
      <line x1="1.5" y1="5" x2="14.5" y2="11" />
      <line x1="14.5" y1="5" x2="1.5" y2="11" />
    </svg>
  )
}

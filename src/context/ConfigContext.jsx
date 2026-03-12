'use client'

import { createContext, useContext, useEffect, useState } from 'react'

const ConfigContext = createContext(null)

const DEFAULT_WALLETS = [{ address: '', chains: ['eth'] }]

export function ConfigProvider({ children }) {
  const [apiKey,    setApiKey]    = useState('')
  const [unisatKey, setUnisatKey] = useState('')
  const [wallets,   setWallets]   = useState(DEFAULT_WALLETS)
  const [ready,     setReady]     = useState(false)

  // Load from localStorage after mount — avoids SSR/client hydration mismatch
  useEffect(() => {
    try {
      const key = localStorage.getItem('cfg:apiKey')
      if (key !== null) setApiKey(JSON.parse(key))
    } catch {}

    try {
      const key = localStorage.getItem('cfg:unisatKey')
      if (key !== null) setUnisatKey(JSON.parse(key))
    } catch {}

    try {
      const raw = JSON.parse(localStorage.getItem('cfg:wallets') || 'null')
      if (Array.isArray(raw) && raw.length) {
        // Migrate from old string[] format
        setWallets(typeof raw[0] === 'string'
          ? raw.map(address => ({ address, chains: ['eth'] }))
          : raw
        )
      }
    } catch {}

    setReady(true)
  }, [])

  // Only persist after the initial load, so we don't overwrite stored data with defaults
  useEffect(() => { if (ready) localStorage.setItem('cfg:apiKey',    JSON.stringify(apiKey))    }, [apiKey,    ready])
  useEffect(() => { if (ready) localStorage.setItem('cfg:unisatKey', JSON.stringify(unisatKey)) }, [unisatKey, ready])
  useEffect(() => { if (ready) localStorage.setItem('cfg:wallets',   JSON.stringify(wallets))   }, [wallets,   ready])

  return (
    <ConfigContext.Provider value={{ apiKey, setApiKey, unisatKey, setUnisatKey, wallets, setWallets }}>
      {children}
    </ConfigContext.Provider>
  )
}

export function useConfig() {
  return useContext(ConfigContext)
}

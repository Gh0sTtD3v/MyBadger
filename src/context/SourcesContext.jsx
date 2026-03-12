'use client'

import { createContext, useContext, useEffect, useState } from 'react'

const SourcesContext = createContext(null)

function newSource() {
  return { id: `${Date.now()}-${Math.random()}`, name: '', type: 'wallet', address: '', chains: ['eth'], chain: 'eth', enabled: true }
}

export function SourcesProvider({ children }) {
  const [sources, setSources] = useState([newSource()])
  const [ready,   setReady]   = useState(false)

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('cfg:sources') || 'null')
      if (Array.isArray(raw) && raw.length) setSources(raw)
    } catch {}
    setReady(true)
  }, [])

  useEffect(() => {
    if (ready) localStorage.setItem('cfg:sources', JSON.stringify(sources))
  }, [sources, ready])

  return (
    <SourcesContext.Provider value={{ sources, setSources, newSource }}>
      {children}
    </SourcesContext.Provider>
  )
}

export function useSources() {
  return useContext(SourcesContext)
}

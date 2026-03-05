'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const CurationsContext = createContext(null)

export function CurationsProvider({ children }) {
  const [curations, setCurations] = useState([])

  const refresh = useCallback(async () => {
    if (!window.electron) return
    const list = await window.electron.curations.list()
    setCurations(list)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return (
    <CurationsContext.Provider value={{ curations, refresh }}>
      {children}
    </CurationsContext.Provider>
  )
}

export function useCurations() {
  return useContext(CurationsContext)
}

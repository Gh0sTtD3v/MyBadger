'use client'

import NavBar from '../components/NavBar'
import { ConfigProvider } from '../context/ConfigContext'
import { CurationsProvider } from '../context/CurationsContext'
import { SourcesProvider } from '../context/SourcesContext'

export default function ClientLayout({ children }) {
  return (
    <ConfigProvider>
      <SourcesProvider>
      <CurationsProvider>
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
          <NavBar />
          <main style={{ flex: 1, overflow: 'auto' }}>
            {children}
          </main>
        </div>
      </CurationsProvider>
      </SourcesProvider>
    </ConfigProvider>
  )
}

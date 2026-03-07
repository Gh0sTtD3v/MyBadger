import './globals.css'
import ClientLayout from './ClientLayout'

export const metadata = {
  title: 'MyBadger',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#0a0a0a', color: '#e5e5e5', fontFamily: 'monospace' }}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
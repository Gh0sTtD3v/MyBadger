import './globals.css'
import ClientLayout from './ClientLayout'

export const metadata = {
  title: 'MyBadger',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-ui)', fontSize: '14px', WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
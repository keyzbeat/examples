import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export const metadata: Metadata = {
  title: { default: 'Event Management OS', template: '%s · Event Management OS' },
  description: 'Event management & concierge operating platform.',
}
export const viewport: Viewport = { themeColor: '#FFFFFF', width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans">
        {children}
        <Toaster position="bottom-right" toastOptions={{ classNames: { toast: 'rounded-xl! border-line! shadow-pop! text-[13px]! font-sans!' } }} />
      </body>
    </html>
  )
}

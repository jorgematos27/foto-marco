import type { Metadata } from 'next'
import { Oswald } from 'next/font/google'
import './globals.css'

const oswald = Oswald({
  subsets: ['latin'],
  weight: ['700'],
  variable: '--font-oswald',
  display: 'swap',
})

export const metadata: Metadata = {
  title: "King's Pride Kanel — MVP Card",
  description: 'Tómate tu foto y genera tu MVP Card',
}

type LayoutProps<T extends string> = {
  children: React.ReactNode
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es" className={`${oswald.variable} h-full bg-black`}>
      <body className="min-h-full bg-black overscroll-none">{children}</body>
    </html>
  )
}

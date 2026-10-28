import Link from 'next/link'
import { Metadata } from 'next'
import { supabase } from '@/lib/supabase'

type Props = { params: Promise<{ id: string }> }

async function getNombre(id: string): Promise<string | null> {
  const query = supabase.from('fotos').select('nombre').eq('id', id).single()
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000))
  const result = await Promise.race([query, timeout])
  if (!result) return null
  const { data } = result as { data: { nombre: string | null } | null }
  return data?.nombre ?? null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const nombre = await getNombre(id)
  const title = nombre ? `${nombre} — King's Pride MVP Card` : "King's Pride MVP Card"
  return {
    title,
    openGraph: { title, images: ['/bienvenida.png'] },
  }
}

export default async function SharePage({ params }: Props) {
  const { id } = await params

  return (
    <div className="relative w-full min-h-[100dvh] bg-black flex flex-col items-center justify-center px-6">
      <img src="/bienvenida.png" alt="" className="fixed inset-0 w-full h-full object-cover opacity-25" />
      <div className="fixed inset-0 bg-black/80" />

      <div
        className="relative z-10 flex flex-col items-center gap-6 w-full max-w-sm py-10"
        style={{ paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))' }}
      >
        <div className="text-center mb-2">
          <p
            className="font-black text-4xl uppercase tracking-wider"
            style={{
              color: '#FFD700',
              fontFamily: 'var(--font-oswald), Impact',
              textShadow: '0 0 40px rgba(255,215,0,0.5)',
            }}
          >
            King&apos;s Pride
          </p>
          <p className="text-white/90 font-bold text-lg uppercase tracking-widest mt-1">
            MVP Card
          </p>
        </div>

        <p className="text-white/70 text-sm text-center leading-relaxed max-w-xs">
          ¿Qué quieres hacer?
        </p>

        <Link
          href={`/foto/${id}`}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-full font-black text-white text-sm uppercase tracking-widest"
          style={{
            background: 'linear-gradient(135deg, #DD0000 0%, #770000 100%)',
            boxShadow: '0 0 35px rgba(220,0,0,0.45)',
          }}
        >
          🏆 Ver esta carta
        </Link>

        <Link
          href="/gallery"
          className="w-full flex items-center justify-center gap-2 py-4 rounded-full font-bold text-white text-sm uppercase tracking-widest border border-white/20 bg-white/5 backdrop-blur-sm"
        >
          🖼️ Ver galería
        </Link>
      </div>
    </div>
  )
}

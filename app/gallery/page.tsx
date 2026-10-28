import Link from 'next/link'
import { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import Galeria, { type Foto } from '@/components/Galeria'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Galería — King\'s Pride MVP Card',
  description: 'Todas las MVP Cards generadas por los fanáticos.',
}

async function getInicial(): Promise<Foto[]> {
  const query = supabase
    .from('fotos')
    .select('id, image_url, nombre, created_at')
    .order('created_at', { ascending: false })
    .range(0, 11)
  const timeout = new Promise<{ data: null }>((resolve) =>
    setTimeout(() => resolve({ data: null }), 3000)
  )
  const result = (await Promise.race([query, timeout])) as { data: Foto[] | null }
  return result.data ?? []
}

export default async function GalleryPage() {
  const inicial = await getInicial()

  return (
    <div className="relative w-full min-h-[100dvh] bg-black">
      <img
        src="/bienvenida.png"
        alt=""
        className="fixed inset-0 w-full h-full object-cover opacity-10"
      />
      <div className="fixed inset-0 bg-black/85" />

      <div
        className="relative z-10 flex flex-col items-center px-5 pt-6 w-full max-w-6xl mx-auto"
        style={{ paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))' }}
      >
        <div className="w-full flex items-center justify-between mb-6">
          <Link href="/" className="text-white/60 text-sm font-semibold hover:text-white">
            ← Inicio
          </Link>
          <Link
            href="/"
            className="px-5 py-2 rounded-full font-bold text-white text-xs uppercase tracking-widest"
            style={{ background: 'linear-gradient(135deg, #DD0000, #770000)' }}
          >
            📷 Crear la mía
          </Link>
        </div>

        <div className="text-center mb-6">
          <p
            className="font-black text-3xl uppercase tracking-wider"
            style={{
              color: '#FFD700',
              fontFamily: 'var(--font-oswald), Impact',
              textShadow: '0 0 30px rgba(255,215,0,0.4)',
            }}
          >
            Galería
          </p>
          <p className="text-white/50 text-sm mt-1">Todas las MVP Cards</p>
        </div>

        <Galeria inicial={inicial} />
      </div>
    </div>
  )
}

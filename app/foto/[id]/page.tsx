import { Metadata } from 'next'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Props = { params: Promise<{ id: string }> }
type Foto = { id: string; image_url: string; nombre: string | null }

async function getFoto(id: string): Promise<Foto | null> {
  const query = supabase.from('fotos').select('*').eq('id', id).single()
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000))
  const result = await Promise.race([query, timeout])
  if (!result) return null
  const { data } = result as { data: Foto | null }
  return data
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const foto = await getFoto(id)
  const title = foto?.nombre ? `${foto.nombre} — MVP Card` : 'MVP Card'
  return {
    title,
    openGraph: {
      title,
      images: foto ? [{ url: foto.image_url, width: 1080, height: 1920 }] : [],
    },
  }
}

export default async function FotoPage({ params }: Props) {
  const { id } = await params
  const foto = await getFoto(id)

  if (!foto) {
    return (
      <div className="relative w-full min-h-[100dvh] bg-black flex flex-col items-center justify-center px-8 py-10">
        <img src="/bienvenida.png" alt="" className="fixed inset-0 w-full h-full object-cover opacity-20" />
        <div className="fixed inset-0 bg-black/80" />
        <div className="relative z-10 flex flex-col items-center gap-6 max-w-sm w-full">
          <p className="text-white text-xl font-bold text-center">
            No pudimos cargar esta tarjeta
          </p>
          <p className="text-white/50 text-sm text-center">
            Intenta de nuevo o toma tu propia foto
          </p>
          <Link
            href="/"
            className="w-full flex items-center justify-center gap-2 py-4 rounded-full text-white font-black uppercase tracking-widest text-sm"
            style={{
              background: 'linear-gradient(135deg, #DD0000 0%, #770000 100%)',
              boxShadow: '0 0 35px rgba(220,0,0,0.45)',
            }}
          >
            📷 Tómate tu foto
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full min-h-[100dvh] bg-black flex flex-col items-center">
      <img src="/bienvenida.png" alt="" className="fixed inset-0 w-full h-full object-cover opacity-15" />
      <div className="fixed inset-0 bg-black/80" />

      <div
        className="relative z-10 flex flex-col items-center gap-4 px-5 pt-6 w-full max-w-sm"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
        <img
          src={foto.image_url}
          alt={foto.nombre ?? 'MVP Card'}
          className="w-full rounded-xl shadow-2xl ring-1 ring-white/10"
        />

        <Link
          href="/"
          className="w-full flex items-center justify-center gap-2 py-4 rounded-full text-white font-black uppercase tracking-widest text-sm"
          style={{
            background: 'linear-gradient(135deg, #DD0000 0%, #770000 100%)',
            boxShadow: '0 0 35px rgba(220,0,0,0.45)',
          }}
        >
          📷 Crea tu MVP Card
        </Link>

        <a
          href={`/api/download?url=${encodeURIComponent(foto.image_url)}&id=${id}`}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-full text-white font-bold uppercase tracking-widest text-sm border border-white/20 bg-white/5 backdrop-blur-sm"
        >
          ↓ Descargar esta tarjeta
        </a>
      </div>
    </div>
  )
}

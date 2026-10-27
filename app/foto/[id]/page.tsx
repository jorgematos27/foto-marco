import { Metadata } from 'next'
import { supabase } from '@/lib/supabase'

type Props = { params: Promise<{ id: string }> }

async function getFoto(id: string) {
  const { data } = await supabase
    .from('fotos')
    .select('*')
    .eq('id', id)
    .single()
  return data
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const foto = await getFoto(id)
  return {
    title: 'Mi foto con marco',
    openGraph: {
      title: 'Mi foto con marco',
      images: foto ? [{ url: foto.image_url, width: 1080, height: 1920 }] : [],
    },
  }
}

export default async function FotoPage({ params }: Props) {
  const { id } = await params
  const foto = await getFoto(id)

  if (!foto) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Foto no encontrada.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6 p-6 min-h-screen bg-white max-w-sm mx-auto">
      <img
        src={foto.image_url}
        alt="Foto con marco"
        className="w-full rounded-xl shadow-lg"
      />
      <DescargaBoton url={foto.image_url} id={id} />
    </div>
  )
}

function DescargaBoton({ url, id }: { url: string; id: string }) {
  return (
    <a
      href={`/api/download?url=${encodeURIComponent(url)}&id=${id}`}
      className="w-full bg-black text-white py-3 rounded-full text-base font-medium text-center block"
    >
      Descargar foto
    </a>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImagePlus } from 'lucide-react'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { fetchMatchPhotos, uploadMatchPhotos } from '@/lib/match-photos'
import type { MatchPhotoRow } from '@/types/database'

type Props = {
  matchId: string
  userId: string | undefined
  canUpload: boolean
}

export function MatchPhotosSection({ matchId, userId, canUpload }: Props) {
  const { t } = useTranslation()
  const [photos, setPhotos] = useState<MatchPhotoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    const list = await fetchMatchPhotos(matchId)
    setPhotos(list)
    setLoading(false)
  }, [matchId])

  useEffect(() => {
    void reload()
  }, [reload])

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : []
    e.target.value = ''
    if (!userId || files.length === 0) return
    setErr(null)
    setMsg(null)
    setUploading(true)
    const { error, uploaded } = await uploadMatchPhotos(matchId, userId, files)
    setUploading(false)
    if (error) {
      if (error.message === 'max_photos') setErr(t('match_photos.err_max'))
      else if (error.message === 'no_valid_files') setErr(t('match_photos.err_format'))
      else setErr(error.message)
      return
    }
    setMsg(t('match_photos.uploaded', { count: uploaded }))
    void reload()
  }

  return (
    <Card className="shadow-md ring-1 ring-border/80">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">{t('match_photos.title')}</h2>
        {canUpload && userId && (
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="sr-only"
              onChange={(e) => void onFiles(e)}
              disabled={uploading}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2"
            >
              <ImagePlus className="size-4" />
              {uploading ? t('match_photos.uploading') : t('match_photos.add')}
            </Button>
          </div>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{t('match_photos.hint')}</p>
      {err && <p className="mt-2 text-sm font-medium text-destructive">{err}</p>}
      {msg && <p className="mt-2 text-sm font-medium text-primary">{msg}</p>}
      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : photos.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{t('match_photos.empty')}</p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((p) => (
            <li key={p.id} className="overflow-hidden rounded-lg border border-border">
              <a href={p.url} target="_blank" rel="noreferrer" className="block">
                <img src={p.url} alt="" className="aspect-square w-full object-cover transition hover:opacity-90" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

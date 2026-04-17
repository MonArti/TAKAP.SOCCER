import { supabase } from '@/lib/supabase'
import type { MatchPhotoRow } from '@/types/database'

export const MATCH_PHOTOS_BUCKET = 'match-photos' as const

const MAX_FILES_PER_BATCH = 5
const MAX_PHOTOS_PER_MATCH = 20
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function fetchMatchPhotos(matchId: string): Promise<MatchPhotoRow[]> {
  const { data, error } = await supabase
    .from('match_photos')
    .select('*')
    .eq('match_id', matchId)
    .order('created_at', { ascending: true })

  if (error) {
    console.warn('[match_photos] list:', error.message)
    return []
  }
  return (data ?? []) as MatchPhotoRow[]
}

export async function countMatchPhotos(matchId: string): Promise<number> {
  const { count, error } = await supabase
    .from('match_photos')
    .select('*', { count: 'exact', head: true })
    .eq('match_id', matchId)

  if (error) return 0
  return count ?? 0
}

export async function uploadMatchPhotos(
  matchId: string,
  userId: string,
  files: File[],
): Promise<{ error: Error | null; uploaded: number }> {
  const list = files.slice(0, MAX_FILES_PER_BATCH).filter((f) => ALLOWED.includes(f.type))
  if (list.length === 0) {
    return { error: new Error('no_valid_files'), uploaded: 0 }
  }

  const existing = await countMatchPhotos(matchId)
  if (existing >= MAX_PHOTOS_PER_MATCH) {
    return { error: new Error('max_photos'), uploaded: 0 }
  }

  const room = MAX_PHOTOS_PER_MATCH - existing
  const toUpload = list.slice(0, Math.min(list.length, room))
  let uploaded = 0

  for (const file of toUpload) {
    const ext = file.name.split('.').pop()?.toLowerCase()
    const safeExt = ext && ext.length <= 5 ? ext : 'jpg'
    const path = `${matchId}/${userId}/${crypto.randomUUID()}.${safeExt}`

    const { error: upErr } = await supabase.storage.from(MATCH_PHOTOS_BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })
    if (upErr) {
      return { error: new Error(upErr.message), uploaded }
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(MATCH_PHOTOS_BUCKET).getPublicUrl(path)

    const { error: insErr } = await supabase.from('match_photos').insert({
      match_id: matchId,
      url: publicUrl,
      uploaded_by: userId,
    })
    if (insErr) {
      return { error: new Error(insErr.message), uploaded }
    }
    uploaded++
  }

  return { error: null, uploaded }
}

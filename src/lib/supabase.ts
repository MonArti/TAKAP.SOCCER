import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

/** False en prod si les variables Vercel / build ne sont pas définies (sinon createClient plante → page blanche). */
export const isSupabaseConfigured = Boolean(url && key)

// Valeurs factices : @supabase/supabase-js exige une URL https et une clé non vides au chargement du module.
const FALLBACK_URL = 'https://env-manquant.invalid'
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.missing-env'

if (!isSupabaseConfigured) {
  console.warn(
    '[Takap.Soccer] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquantes. Local : copier .env.example vers .env. Vercel : Project → Settings → Environment Variables, puis Redeploy.',
  )
}

export const supabase = createClient<Database>(url || FALLBACK_URL, key || FALLBACK_KEY)

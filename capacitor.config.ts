import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Web build: `dist/` (Vercel + `npx cap copy`).
 * Live reload (dev): décommente `server` avec l’IP LAN de ta machine (ex. `http://192.168.1.10:5173`)
 * et lance `npm run dev -- --host 0.0.0.0`, puis `npx cap run android`.
 *
 * App Links / Digital Asset Links: à configurer dans Android Studio (intent-filter + fichier assetlinks.json
 * sur ton domaine) — voir https://capacitorjs.com/docs/guides/deep-links
 */
const config: CapacitorConfig = {
  appId: 'com.takapsoccer.app',
  appName: 'TakapSoccer',
  webDir: 'dist',
  ios: {
    /** Requis pour OneSignal (évite « APNS Delegate Never Fired »). */
    handleApplicationNotifications: false,
  },
  // server: {
  //   url: 'http://10.0.2.2:5173',
  //   cleartext: true,
  // },
}

export default config

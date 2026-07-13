import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getDatabase, type Database } from 'firebase/database'

// Firebase 網頁設定會暴露在前端，安全性靠 Realtime Database 規則保護
const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    'AIzaSyAnKliqIVvvo8AuwOwan6U8TQ-2aDO-8AM',
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    'bill-split-4fd3b.firebaseapp.com',
  databaseURL:
    import.meta.env.VITE_FIREBASE_DATABASE_URL ||
    'https://bill-split-4fd3b-default-rtdb.firebaseio.com',
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID || 'bill-split-4fd3b',
}

export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.databaseURL &&
      firebaseConfig.projectId,
  )
}

let app: FirebaseApp | null = null
let database: Database | null = null

export function getFirebaseDatabase(): Database | null {
  if (!isFirebaseConfigured()) return null
  if (!app) app = initializeApp(firebaseConfig)
  if (!database) database = getDatabase(app)
  return database
}

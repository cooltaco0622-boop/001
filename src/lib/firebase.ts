import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getDatabase, type Database } from 'firebase/database'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
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

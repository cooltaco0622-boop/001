import { get, ref, remove, set } from 'firebase/database'
import type { Expense, Person } from '../types'
import { getFirebaseDatabase, isFirebaseConfigured } from './firebase'
import { createRoomId } from './share'

export interface ArchiveSave {
  id: string
  name: string
  createdAt: number
  people: Person[]
  expenses: Expense[]
}

export function formatArchiveName(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${hh}:${mm}`
}

export async function listArchives(): Promise<ArchiveSave[]> {
  const db = getFirebaseDatabase()
  if (!db || !isFirebaseConfigured()) return []

  const snapshot = await get(ref(db, 'archives'))
  const value = snapshot.val() as Record<string, ArchiveSave> | null
  if (!value) return []

  return Object.values(value)
    .filter((item) => item?.id && item?.people && item?.expenses)
    .sort((a, b) => b.createdAt - a.createdAt)
}

export async function createArchive(
  people: Person[],
  expenses: Expense[],
): Promise<ArchiveSave> {
  const db = getFirebaseDatabase()
  if (!db || !isFirebaseConfigured()) {
    throw new Error('存檔功能尚未設定')
  }

  const now = Date.now()
  const archive: ArchiveSave = {
    id: createRoomId() + createRoomId(),
    name: formatArchiveName(new Date(now)),
    createdAt: now,
    people,
    expenses,
  }

  await set(ref(db, `archives/${archive.id}`), archive)
  return archive
}

export async function overwriteArchive(
  id: string,
  name: string,
  createdAt: number,
  people: Person[],
  expenses: Expense[],
): Promise<ArchiveSave> {
  const db = getFirebaseDatabase()
  if (!db || !isFirebaseConfigured()) {
    throw new Error('存檔功能尚未設定')
  }

  const archive: ArchiveSave = {
    id,
    name,
    createdAt,
    people,
    expenses,
  }

  await set(ref(db, `archives/${id}`), archive)
  return archive
}

export async function deleteArchive(id: string): Promise<void> {
  const db = getFirebaseDatabase()
  if (!db || !isFirebaseConfigured()) {
    throw new Error('存檔功能尚未設定')
  }
  await remove(ref(db, `archives/${id}`))
}

export async function getArchive(id: string): Promise<ArchiveSave | null> {
  const db = getFirebaseDatabase()
  if (!db || !isFirebaseConfigured()) return null

  const snapshot = await get(ref(db, `archives/${id}`))
  const value = snapshot.val() as ArchiveSave | null
  if (!value?.people || !value?.expenses) return null
  return value
}

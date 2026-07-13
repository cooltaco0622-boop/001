import LZString from 'lz-string'
import type { Expense, Person } from '../types'

export interface BillData {
  people: Person[]
  expenses: Expense[]
  updatedAt: number
}

export function createRoomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().slice(0, 8)
  }
  return Math.random().toString(36).slice(2, 10)
}

export function getRoomIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('room')
}

export function getSnapshotFromUrl(): Pick<BillData, 'people' | 'expenses'> | null {
  const encoded = new URLSearchParams(window.location.search).get('s')
  if (!encoded) return null
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded)
    if (!json) return null
    const data = JSON.parse(json) as Pick<BillData, 'people' | 'expenses'>
    if (!Array.isArray(data.people) || !Array.isArray(data.expenses)) return null
    return data
  } catch {
    return null
  }
}

export function buildShareUrl(roomId: string): string {
  const url = new URL(window.location.href)
  url.search = ''
  url.searchParams.set('room', roomId)
  return url.toString()
}

export function buildSnapshotUrl(data: Pick<BillData, 'people' | 'expenses'>): string {
  const url = new URL(window.location.href)
  url.search = ''
  const encoded = LZString.compressToEncodedURIComponent(JSON.stringify(data))
  url.searchParams.set('s', encoded)
  return url.toString()
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

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

export function buildShareUrl(roomId: string): string {
  const url = new URL(window.location.href)
  url.search = ''
  url.searchParams.set('room', roomId)
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

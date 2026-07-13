import { useCallback, useEffect, useRef, useState } from 'react'
import { get, ref, set } from 'firebase/database'
import type { Expense, Person } from '../types'
import { getFirebaseDatabase, isFirebaseConfigured } from '../lib/firebase'
import {
  buildShareUrl,
  copyToClipboard,
  createRoomId,
  getRoomIdFromUrl,
  type BillData,
} from '../lib/share'

const SAVE_DEBOUNCE_MS = 500

interface UseBillSyncOptions {
  people: Person[]
  expenses: Expense[]
  onRemoteUpdate: (data: Pick<BillData, 'people' | 'expenses'>) => void
}

export function useBillSync({ people, expenses, onRemoteUpdate }: UseBillSyncOptions) {
  const initialRoomId = getRoomIdFromUrl()
  const [roomId, setRoomId] = useState<string | null>(initialRoomId)
  const [shareStatus, setShareStatus] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(
    Boolean(initialRoomId && isFirebaseConfigured()),
  )
  const [isRefreshing, setIsRefreshing] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestDataRef = useRef({ people, expenses })
  const hasLoadedRef = useRef(false)

  latestDataRef.current = { people, expenses }

  const showStatus = useCallback((message: string) => {
    setShareStatus(message)
    window.setTimeout(() => setShareStatus(null), 4000)
  }, [])

  const pushToRoom = useCallback(async (targetRoomId: string, data: BillData) => {
    const db = getFirebaseDatabase()
    if (!db) return false
    await set(ref(db, `rooms/${targetRoomId}`), data)
    return true
  }, [])

  const loadFromRoom = useCallback(
    async (targetRoomId: string) => {
      const db = getFirebaseDatabase()
      if (!db) return false

      const snapshot = await get(ref(db, `rooms/${targetRoomId}`))
      const value = snapshot.val() as BillData | null
      if (!value?.people || !value?.expenses) return false

      onRemoteUpdate({ people: value.people, expenses: value.expenses })
      return true
    },
    [onRemoteUpdate],
  )

  useEffect(() => {
    if (!roomId || !isFirebaseConfigured()) {
      setIsLoading(false)
      return
    }

    hasLoadedRef.current = false
    void loadFromRoom(roomId)
      .finally(() => {
        hasLoadedRef.current = true
        setIsLoading(false)
      })
  }, [roomId, loadFromRoom])

  useEffect(() => {
    if (!roomId || !isFirebaseConfigured() || isLoading || !hasLoadedRef.current) {
      return
    }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)

    saveTimerRef.current = setTimeout(() => {
      void pushToRoom(roomId, {
        ...latestDataRef.current,
        updatedAt: Date.now(),
      })
    }, SAVE_DEBOUNCE_MS)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [people, expenses, roomId, pushToRoom, isLoading])

  const shareBill = useCallback(async () => {
    if (!isFirebaseConfigured()) {
      showStatus('分享功能尚未設定，請先設定 Firebase')
      return
    }

    const data = latestDataRef.current
    const targetRoomId = roomId ?? createRoomId()
    const ok = await pushToRoom(targetRoomId, { ...data, updatedAt: Date.now() })

    if (!ok) {
      showStatus('分享失敗，請稍後再試')
      return
    }

    if (!roomId) {
      setRoomId(targetRoomId)
      window.history.replaceState(null, '', buildShareUrl(targetRoomId))
    }

    const shareUrl = buildShareUrl(targetRoomId)
    const copied = await copyToClipboard(shareUrl)
    showStatus(
      copied
        ? '連結已複製！重新整理可看最新內容'
        : `請複製連結：${shareUrl}`,
    )
  }, [roomId, pushToRoom, showStatus])

  const refreshFromRoom = useCallback(async () => {
    if (!roomId || !isFirebaseConfigured()) return

    setIsRefreshing(true)
    const ok = await loadFromRoom(roomId)
    setIsRefreshing(false)
    showStatus(ok ? '已載入最新資料' : '找不到分享資料')
  }, [roomId, loadFromRoom, showStatus])

  const syncNow = useCallback(
    async (data: Pick<BillData, 'people' | 'expenses'>) => {
      if (!roomId || !isFirebaseConfigured()) return
      await pushToRoom(roomId, { ...data, updatedAt: Date.now() })
    },
    [roomId, pushToRoom],
  )

  const leaveRoom = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    setRoomId(null)
    hasLoadedRef.current = false
    const url = new URL(window.location.href)
    url.searchParams.delete('room')
    window.history.replaceState(null, '', `${url.pathname}${url.hash}`)
  }, [])

  return {
    roomId,
    isShared: Boolean(roomId),
    isLoading,
    isRefreshing,
    isFirebaseReady: isFirebaseConfigured(),
    shareStatus,
    shareBill,
    refreshFromRoom,
    syncNow,
    leaveRoom,
  }
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { onValue, ref, set } from 'firebase/database'
import type { Expense, Person } from '../types'
import { getFirebaseDatabase, isFirebaseConfigured } from '../lib/firebase'
import {
  buildShareUrl,
  buildSnapshotUrl,
  copyToClipboard,
  createRoomId,
  getRoomIdFromUrl,
  type BillData,
} from '../lib/share'

const SYNC_DEBOUNCE_MS = 400

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
  const skipPushRef = useRef(false)
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestDataRef = useRef({ people, expenses })

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

  useEffect(() => {
    if (!roomId || !isFirebaseConfigured()) {
      setIsLoading(false)
      return
    }

    const db = getFirebaseDatabase()
    if (!db) {
      setIsLoading(false)
      return
    }

    const roomRef = ref(db, `rooms/${roomId}`)
    const unsubscribe = onValue(
      roomRef,
      (snapshot) => {
        setIsLoading(false)
        const value = snapshot.val() as BillData | null
        if (!value?.people || !value?.expenses) return

        skipPushRef.current = true
        onRemoteUpdate({ people: value.people, expenses: value.expenses })
      },
      () => setIsLoading(false),
    )

    return () => unsubscribe()
  }, [roomId, onRemoteUpdate])

  useEffect(() => {
    if (!roomId || !isFirebaseConfigured() || skipPushRef.current || isLoading) {
      skipPushRef.current = false
      return
    }

    if (pushTimerRef.current) clearTimeout(pushTimerRef.current)

    pushTimerRef.current = setTimeout(() => {
      void pushToRoom(roomId, {
        ...latestDataRef.current,
        updatedAt: Date.now(),
      })
    }, SYNC_DEBOUNCE_MS)

    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
    }
  }, [people, expenses, roomId, pushToRoom, isLoading])

  const shareBill = useCallback(async () => {
    const data = latestDataRef.current

    if (isFirebaseConfigured()) {
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
          ? '連結已複製！對方可即時查看與編輯'
          : `請複製連結：${shareUrl}`,
      )
      return
    }

    const shareUrl = buildSnapshotUrl(data)
    const copied = await copyToClipboard(shareUrl)
    showStatus(
      copied
        ? '連結已複製！（快照模式，編輯不會即時同步）'
        : `請複製連結：${shareUrl}`,
    )
  }, [roomId, pushToRoom, showStatus])

  const syncNow = useCallback(
    async (data: Pick<BillData, 'people' | 'expenses'>) => {
      if (!roomId || !isFirebaseConfigured()) return
      skipPushRef.current = true
      await pushToRoom(roomId, { ...data, updatedAt: Date.now() })
    },
    [roomId, pushToRoom],
  )

  return {
    roomId,
    isShared: Boolean(roomId),
    isLoading,
    isFirebaseReady: isFirebaseConfigured(),
    shareStatus,
    shareBill,
    syncNow,
  }
}

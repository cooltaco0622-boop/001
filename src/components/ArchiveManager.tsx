import { useCallback, useEffect, useState } from 'react'
import type { Expense, Person } from '../types'
import {
  createArchive,
  deleteArchive,
  listArchives,
  overwriteArchive,
  type ArchiveSave,
} from '../lib/archives'
import { isFirebaseConfigured } from '../lib/firebase'

interface ArchiveManagerProps {
  people: Person[]
  expenses: Expense[]
  onLoad: (data: { people: Person[]; expenses: Expense[] }) => void
  onStatus: (message: string) => void
  clearSignal?: number
}

function formatTotal(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + (e.amount > 0 ? e.amount : 0), 0)
}

export default function ArchiveManager({
  people,
  expenses,
  onLoad,
  onStatus,
  clearSignal = 0,
}: ArchiveManagerProps) {
  const [open, setOpen] = useState(false)
  const [archives, setArchives] = useState<ArchiveSave[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [overwriting, setOverwriting] = useState(false)
  const [activeArchive, setActiveArchive] = useState<{
    id: string
    name: string
    createdAt: number
  } | null>(null)

  useEffect(() => {
    if (clearSignal > 0) setActiveArchive(null)
  }, [clearSignal])

  const refreshList = useCallback(async () => {
    if (!isFirebaseConfigured()) return
    setLoading(true)
    try {
      const list = await listArchives()
      setArchives(list)
    } catch {
      onStatus('無法載入存檔列表')
    } finally {
      setLoading(false)
    }
  }, [onStatus])

  useEffect(() => {
    if (open) void refreshList()
  }, [open, refreshList])

  const handleSave = async () => {
    if (!isFirebaseConfigured()) {
      onStatus('存檔功能尚未設定 Firebase')
      return
    }

    setSaving(true)
    try {
      const archive = await createArchive(people, expenses)
      setActiveArchive({
        id: archive.id,
        name: archive.name,
        createdAt: archive.createdAt,
      })
      onStatus(`已存檔：${archive.name}`)
      if (open) await refreshList()
    } catch {
      onStatus('存檔失敗，請稍後再試')
    } finally {
      setSaving(false)
    }
  }

  const handleOverwrite = async () => {
    if (!isFirebaseConfigured()) {
      onStatus('存檔功能尚未設定 Firebase')
      return
    }

    if (!activeArchive) {
      onStatus('目前沒有可覆蓋的存檔，請先「存檔」或從「存檔管理」載入')
      return
    }

    if (
      !window.confirm(
        `確定要覆蓋存檔「${activeArchive.name}」嗎？原內容將被取代。`,
      )
    ) {
      return
    }

    setOverwriting(true)
    try {
      const archive = await overwriteArchive(
        activeArchive.id,
        activeArchive.name,
        activeArchive.createdAt,
        people,
        expenses,
      )
      setActiveArchive({
        id: archive.id,
        name: archive.name,
        createdAt: archive.createdAt,
      })
      onStatus(`已覆蓋存檔：${archive.name}`)
      if (open) await refreshList()
    } catch {
      onStatus('覆蓋失敗，請稍後再試')
    } finally {
      setOverwriting(false)
    }
  }

  const handleLoad = (archive: ArchiveSave) => {
    if (!window.confirm(`要載入存檔「${archive.name}」嗎？目前畫面資料會被覆蓋。`)) {
      return
    }
    onLoad({ people: archive.people, expenses: archive.expenses })
    setActiveArchive({
      id: archive.id,
      name: archive.name,
      createdAt: archive.createdAt,
    })
    setOpen(false)
    onStatus(`已載入：${archive.name}`)
  }

  const handleDelete = async (archive: ArchiveSave) => {
    if (!window.confirm(`確定刪除存檔「${archive.name}」？`)) return
    try {
      await deleteArchive(archive.id)
      setArchives((prev) => prev.filter((item) => item.id !== archive.id))
      if (activeArchive?.id === archive.id) setActiveArchive(null)
      onStatus(`已刪除：${archive.name}`)
    } catch {
      onStatus('刪除失敗，請稍後再試')
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-save"
        onClick={handleSave}
        disabled={saving || overwriting}
      >
        {saving ? '存檔中…' : '存檔'}
      </button>
      <button
        type="button"
        className="btn btn-overwrite"
        onClick={handleOverwrite}
        disabled={saving || overwriting || !activeArchive}
        title={
          activeArchive
            ? `覆蓋「${activeArchive.name}」`
            : '請先存檔或載入存檔'
        }
      >
        {overwriting ? '覆蓋中…' : '覆蓋存檔'}
      </button>
      <button
        type="button"
        className="btn btn-archives"
        onClick={() => setOpen(true)}
      >
        存檔管理
      </button>

      {activeArchive && (
        <span className="active-archive-hint">目前存檔：{activeArchive.name}</span>
      )}

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div
            className="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="archives-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="archives-title">存檔管理</h2>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setOpen(false)}
                aria-label="關閉"
              >
                ×
              </button>
            </div>

            {loading ? (
              <p className="modal-empty">載入中…</p>
            ) : archives.length === 0 ? (
              <p className="modal-empty">尚無存檔，點「存檔」可建立第一筆</p>
            ) : (
              <ul className="archive-list">
                {archives.map((archive) => (
                  <li
                    key={archive.id}
                    className={`archive-item ${activeArchive?.id === archive.id ? 'active' : ''}`}
                  >
                    <div className="archive-meta">
                      <span className="archive-name">
                        {archive.name}
                        {activeArchive?.id === archive.id ? '（目前）' : ''}
                      </span>
                      <span className="archive-summary">
                        {archive.people.length} 人 · 總額 $
                        {formatTotal(archive.expenses).toLocaleString()}
                      </span>
                    </div>
                    <div className="archive-actions">
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => handleLoad(archive)}
                      >
                        載入
                      </button>
                      <button
                        type="button"
                        className="btn btn-clear"
                        onClick={() => void handleDelete(archive)}
                      >
                        刪除
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  )
}

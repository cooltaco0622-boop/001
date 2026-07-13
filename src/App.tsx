import { useCallback, useMemo, useState } from 'react'
import type { Expense, Person } from './types'
import {
  calculateBalances,
  calculateSettlements,
  createId,
} from './utils/settlement'
import { useBillSync } from './hooks/useBillSync'
import { getRoomIdFromUrl } from './lib/share'
import './App.css'

const DEFAULT_NAMES = ['雅勻', '阿章', '阿佳']

function createDefaultPeople(): Person[] {
  return DEFAULT_NAMES.map((name) => ({ id: createId(), name }))
}

function createDefaultExpense(payerId: string, people: Person[]): Expense {
  return {
    id: createId(),
    name: '',
    amount: 0,
    payerId,
    participantIds: people.map((p) => p.id),
  }
}

function createFreshState() {
  const people = createDefaultPeople()
  return {
    people,
    expenses: people.map((p) => createDefaultExpense(p.id, people)),
  }
}

let bootState: ReturnType<typeof createFreshState> | null = null

function getBootState() {
  if (!bootState) bootState = createFreshState()
  return bootState
}

export default function App() {
  const hasRoomInUrl = Boolean(getRoomIdFromUrl())
  const [people, setPeople] = useState<Person[]>(() =>
    hasRoomInUrl ? [] : getBootState().people,
  )
  const [expenses, setExpenses] = useState<Expense[]>(() =>
    hasRoomInUrl ? [] : getBootState().expenses,
  )

  const onRemoteUpdate = useCallback(
    (data: { people: Person[]; expenses: Expense[] }) => {
      bootState = data
      setPeople(data.people)
      setExpenses(data.expenses)
    },
    [],
  )

  const {
    roomId,
    isShared,
    isLoading,
    isRefreshing,
    shareStatus,
    shareBill,
    refreshFromRoom,
    syncNow,
  } = useBillSync({ people, expenses, onRemoteUpdate })

  const balances = useMemo(
    () => calculateBalances(people, expenses),
    [people, expenses],
  )

  const settlements = useMemo(
    () => calculateSettlements(balances),
    [balances],
  )

  const totalAmount = useMemo(
    () => expenses.reduce((sum, e) => sum + (e.amount > 0 ? e.amount : 0), 0),
    [expenses],
  )

  const expensesByPerson = useMemo(() => {
    const map = new Map<string, Expense[]>(
      people.map((p) => [p.id, []]),
    )
    for (const expense of expenses) {
      const list = map.get(expense.payerId) ?? []
      list.push(expense)
      map.set(expense.payerId, list)
    }
    return map
  }, [people, expenses])

  const getPersonName = (id: string) =>
    people.find((p) => p.id === id)?.name || '未知'

  const updatePersonName = (id: string, name: string) => {
    setPeople((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name } : p)),
    )
  }

  const addPerson = () => {
    const newPerson: Person = {
      id: createId(),
      name: `成員 ${people.length + 1}`,
    }
    setPeople((prev) => [...prev, newPerson])
    setExpenses((prev) => [
      ...prev.map((e) => ({
        ...e,
        participantIds: [...e.participantIds, newPerson.id],
      })),
      createDefaultExpense(newPerson.id, [...people, newPerson]),
    ])
  }

  const removePerson = (id: string) => {
    if (people.length <= 2) return
    const fallbackId = people.find((p) => p.id !== id)?.id ?? ''
    setPeople((prev) => prev.filter((p) => p.id !== id))
    setExpenses((prev) =>
      prev
        .filter((e) => e.payerId !== id)
        .map((e) => ({
          ...e,
          participantIds: e.participantIds.filter((pid) => pid !== id),
        }))
        .filter((e) => e.participantIds.length > 0)
        .map((e) => ({
          ...e,
          payerId: e.payerId === id ? fallbackId : e.payerId,
        })),
    )
  }

  const addExpenseForPerson = (personId: string) => {
    setExpenses((prev) => [...prev, createDefaultExpense(personId, people)])
  }

  const updateExpense = (id: string, patch: Partial<Expense>) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    )
  }

  const removeExpense = (personId: string, expenseId: string) => {
    const personExpenses = expensesByPerson.get(personId) ?? []
    if (personExpenses.length <= 1) return
    setExpenses((prev) => prev.filter((e) => e.id !== expenseId))
  }

  const toggleParticipant = (expenseId: string, personId: string) => {
    setExpenses((prev) =>
      prev.map((e) => {
        if (e.id !== expenseId) return e
        const has = e.participantIds.includes(personId)
        const participantIds = has
          ? e.participantIds.filter((id) => id !== personId)
          : [...e.participantIds, personId]
        return { ...e, participantIds }
      }),
    )
  }

  const selectAllParticipants = (expenseId: string) => {
    setExpenses((prev) =>
      prev.map((e) =>
        e.id === expenseId
          ? { ...e, participantIds: people.map((p) => p.id) }
          : e,
      ),
    )
  }

  const clearAll = () => {
    if (!window.confirm('確定要清除所有已輸入的資料嗎？')) return
    const fresh = createFreshState()
    bootState = fresh
    setPeople(fresh.people)
    setExpenses(fresh.expenses)
    if (isShared) void syncNow(fresh)
  }

  if (isLoading) {
    return (
      <div className="app app-loading">
        <p>正在載入分享的分帳資料…</p>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>分帳計算器</h1>
          <p>依人員填寫代付項目，自動計算平攤結果</p>
        </div>
        <div className="header-actions">
          <div className="header-stat">
            <span className="stat-label">總花費</span>
            <span className="stat-value">${totalAmount.toLocaleString()}</span>
          </div>
          <div className="header-buttons">
            {isShared && (
              <button
                type="button"
                className="btn btn-refresh"
                onClick={refreshFromRoom}
                disabled={isRefreshing}
              >
                {isRefreshing ? '載入中…' : '重新整理'}
              </button>
            )}
            <button type="button" className="btn btn-share" onClick={shareBill}>
              {isShared ? '複製分享連結' : '分享連結'}
            </button>
            <button type="button" className="btn btn-clear" onClick={clearAll}>
              一鍵清除
            </button>
          </div>
        </div>
      </header>

      {shareStatus && <div className="share-toast">{shareStatus}</div>}

      {isShared && (
        <div className="share-banner">
          分享連結 · 房間 {roomId} · 重新整理可看最新內容
        </div>
      )}

      <main className="main">
        <div className="people-sections">
          {people.map((person, personIndex) => {
            const personExpenses = expensesByPerson.get(person.id) ?? []

            return (
              <section key={person.id} className="card person-card">
                <div className="person-card-header">
                  <div className="person-title-row">
                    <span className="person-index">{personIndex + 1}</span>
                    <input
                      type="text"
                      className="input person-name-input"
                      value={person.name}
                      onChange={(e) => updatePersonName(person.id, e.target.value)}
                      placeholder="輸入名字"
                    />
                  </div>
                  {people.length > 2 && (
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => removePerson(person.id)}
                      aria-label={`移除 ${person.name}`}
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="person-expenses">
                  {personExpenses.map((expense, expenseIndex) => (
                    <div key={expense.id} className="expense-item">
                      <div className="expense-header">
                        <span className="expense-index">
                          花費項目 {expenseIndex + 1}
                        </span>
                        {personExpenses.length > 1 && (
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => removeExpense(person.id, expense.id)}
                            aria-label="移除此項目"
                          >
                            ×
                          </button>
                        )}
                      </div>

                      <div className="expense-fields">
                        <div className="field field-grow">
                          <label>項目名稱</label>
                          <input
                            type="text"
                            className="input"
                            value={expense.name}
                            onChange={(e) =>
                              updateExpense(expense.id, { name: e.target.value })
                            }
                            placeholder="例如：晚餐、計程車"
                          />
                        </div>
                        <div className="field field-amount">
                          <label>金額</label>
                          <div className="amount-input">
                            <span className="currency">$</span>
                            <input
                              type="number"
                              className="input"
                              min="0"
                              step="1"
                              value={expense.amount || ''}
                              onChange={(e) =>
                                updateExpense(expense.id, {
                                  amount: parseFloat(e.target.value) || 0,
                                })
                              }
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="participants-section">
                        <div className="participants-header">
                          <label>分攤對象（預設全員均分）</label>
                          <button
                            type="button"
                            className="btn-link"
                            onClick={() => selectAllParticipants(expense.id)}
                          >
                            全選
                          </button>
                        </div>
                        <div className="participants-grid">
                          {people.map((p) => {
                            const isSelected = expense.participantIds.includes(p.id)
                            const share =
                              isSelected && expense.amount > 0
                                ? expense.amount / expense.participantIds.length
                                : 0
                            return (
                              <button
                                key={p.id}
                                type="button"
                                className={`participant-chip ${isSelected ? 'selected' : ''}`}
                                onClick={() => toggleParticipant(expense.id, p.id)}
                              >
                                <span className="chip-name">{p.name}</span>
                                {isSelected && expense.amount > 0 && (
                                  <span className="chip-share">
                                    ${Math.round(share)}
                                  </span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="btn btn-ghost btn-add-expense"
                  onClick={() => addExpenseForPerson(person.id)}
                >
                  + 新增花費項目
                </button>
              </section>
            )
          })}
        </div>

        <button type="button" className="btn btn-ghost btn-add-person" onClick={addPerson}>
          + 新增成員
        </button>

        <section className="card settlement-card">
          <h2>平攤結果</h2>

          <div className="balances-row">
            {balances.map((b) => (
              <div
                key={b.personId}
                className={`balance-item ${b.balance > 0.005 ? 'positive' : b.balance < -0.005 ? 'negative' : 'neutral'}`}
              >
                <span className="balance-name">{getPersonName(b.personId)}</span>
                <span className="balance-amount">
                  {b.balance > 0.005
                    ? `應收 $${b.balance}`
                    : b.balance < -0.005
                      ? `應付 $${Math.abs(b.balance)}`
                      : '已結清'}
                </span>
              </div>
            ))}
          </div>

          {settlements.length > 0 ? (
            <div className="settlements">
              <h3>建議轉帳</h3>
              <ul className="settlement-list">
                {settlements.map((s, i) => (
                  <li key={i} className="settlement-item">
                    <span className="settlement-from">
                      {getPersonName(s.fromId)}
                    </span>
                    <span className="settlement-arrow">→</span>
                    <span className="settlement-to">{getPersonName(s.toId)}</span>
                    <span className="settlement-amount">${s.amount}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : totalAmount > 0 ? (
            <p className="settled-message">所有人已結清，無需轉帳！</p>
          ) : (
            <p className="empty-message">填寫花費項目後即可看到平攤結果</p>
          )}
        </section>
      </main>

      <footer className="footer">
        <p>每個人員區塊填寫自己代付的項目，點選成員可調整分攤對象</p>
        <p>分享連結後，其他人重新整理即可看到最新內容</p>
      </footer>
    </div>
  )
}

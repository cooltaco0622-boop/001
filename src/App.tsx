import { useMemo, useState } from 'react'
import type { Expense, Person } from './types'
import {
  calculateBalances,
  calculateSettlements,
  createId,
} from './utils/settlement'
import './App.css'

const DEFAULT_NAMES = ['小明', '小華', '小美']

function createDefaultPeople(): Person[] {
  return DEFAULT_NAMES.map((name) => ({ id: createId(), name }))
}

function createDefaultExpense(people: Person[]): Expense {
  return {
    id: createId(),
    name: '',
    amount: 0,
    payerId: people[0]?.id ?? '',
    participantIds: people.map((p) => p.id),
  }
}

function createInitialState() {
  const people = createDefaultPeople()
  return {
    people,
    expenses: [createDefaultExpense(people)],
  }
}

let initialState: ReturnType<typeof createInitialState> | null = null

function getInitialState() {
  if (!initialState) initialState = createInitialState()
  return initialState
}

export default function App() {
  const [people, setPeople] = useState<Person[]>(() => getInitialState().people)
  const [expenses, setExpenses] = useState<Expense[]>(() => getInitialState().expenses)

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
    setExpenses((prev) =>
      prev.map((e) => ({
        ...e,
        participantIds: [...e.participantIds, newPerson.id],
      })),
    )
  }

  const removePerson = (id: string) => {
    if (people.length <= 2) return
    setPeople((prev) => prev.filter((p) => p.id !== id))
    setExpenses((prev) =>
      prev
        .map((e) => ({
          ...e,
          payerId: e.payerId === id ? people.find((p) => p.id !== id)?.id ?? '' : e.payerId,
          participantIds: e.participantIds.filter((pid) => pid !== id),
        }))
        .filter((e) => e.participantIds.length > 0),
    )
  }

  const addExpense = () => {
    setExpenses((prev) => [...prev, createDefaultExpense(people)])
  }

  const updateExpense = (id: string, patch: Partial<Expense>) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    )
  }

  const removeExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id))
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

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>分帳計算器</h1>
          <p>輕鬆計算聚餐、旅遊的花費，自動算出誰該給誰多少錢</p>
        </div>
        <div className="header-stat">
          <span className="stat-label">總花費</span>
          <span className="stat-value">${totalAmount.toLocaleString()}</span>
        </div>
      </header>

      <main className="main">
        <section className="card">
          <div className="card-header">
            <h2>成員</h2>
            <button type="button" className="btn btn-ghost" onClick={addPerson}>
              + 新增成員
            </button>
          </div>
          <div className="people-grid">
            {people.map((person, index) => (
              <div key={person.id} className="person-item">
                <span className="person-index">{index + 1}</span>
                <input
                  type="text"
                  className="input"
                  value={person.name}
                  onChange={(e) => updatePersonName(person.id, e.target.value)}
                  placeholder="輸入名字"
                />
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
            ))}
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h2>花費項目</h2>
            <button type="button" className="btn btn-ghost" onClick={addExpense}>
              + 新增項目
            </button>
          </div>

          <div className="expenses-list">
            {expenses.map((expense, index) => (
              <div key={expense.id} className="expense-item">
                <div className="expense-header">
                  <span className="expense-index">#{index + 1}</span>
                  {expenses.length > 1 && (
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => removeExpense(expense.id)}
                      aria-label="移除此項目"
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="expense-fields">
                  <div className="field">
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
                  <div className="field">
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
                  <div className="field">
                    <label>付款人</label>
                    <select
                      className="select"
                      value={expense.payerId}
                      onChange={(e) =>
                        updateExpense(expense.id, { payerId: e.target.value })
                      }
                    >
                      {people.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="participants-section">
                  <div className="participants-header">
                    <label>分攤對象</label>
                    <button
                      type="button"
                      className="btn-link"
                      onClick={() => selectAllParticipants(expense.id)}
                    >
                      全選
                    </button>
                  </div>
                  <div className="participants-grid">
                    {people.map((person) => {
                      const isSelected = expense.participantIds.includes(person.id)
                      const share =
                        isSelected && expense.amount > 0
                          ? expense.amount / expense.participantIds.length
                          : 0
                      return (
                        <button
                          key={person.id}
                          type="button"
                          className={`participant-chip ${isSelected ? 'selected' : ''}`}
                          onClick={() => toggleParticipant(expense.id, person.id)}
                        >
                          <span className="chip-name">{person.name}</span>
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
        </section>

        <section className="card settlement-card">
          <h2>結算結果</h2>

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
            <p className="empty-message">新增花費項目後即可看到結算結果</p>
          )}
        </section>
      </main>

      <footer className="footer">
        <p>預設均分，點擊成員可調整分攤對象</p>
      </footer>
    </div>
  )
}

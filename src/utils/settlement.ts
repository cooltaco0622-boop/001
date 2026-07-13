import type { Expense, Person, PersonBalance, Settlement } from '../types'

export function calculateBalances(
  people: Person[],
  expenses: Expense[],
): PersonBalance[] {
  const balances = new Map(people.map((p) => [p.id, 0]))

  for (const expense of expenses) {
    if (expense.amount <= 0 || expense.participantIds.length === 0) continue

    const share = expense.amount / expense.participantIds.length

    balances.set(
      expense.payerId,
      (balances.get(expense.payerId) ?? 0) + expense.amount,
    )

    for (const id of expense.participantIds) {
      balances.set(id, (balances.get(id) ?? 0) - share)
    }
  }

  return people.map((p) => ({
    personId: p.id,
    balance: Math.round((balances.get(p.id) ?? 0) * 100) / 100,
  }))
}

export function calculateSettlements(balances: PersonBalance[]): Settlement[] {
  const creditors = balances
    .filter((b) => b.balance > 0.005)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.balance - a.balance)

  const debtors = balances
    .filter((b) => b.balance < -0.005)
    .map((b) => ({ personId: b.personId, balance: -b.balance }))
    .sort((a, b) => b.balance - a.balance)

  const settlements: Settlement[] = []

  let i = 0
  let j = 0

  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].balance, creditors[j].balance)
    const rounded = Math.round(amount * 100) / 100

    if (rounded > 0) {
      settlements.push({
        fromId: debtors[i].personId,
        toId: creditors[j].personId,
        amount: rounded,
      })
    }

    debtors[i].balance -= amount
    creditors[j].balance -= amount

    if (debtors[i].balance < 0.005) i++
    if (creditors[j].balance < 0.005) j++
  }

  return settlements
}

export function createId(): string {
  return crypto.randomUUID()
}

export interface Person {
  id: string
  name: string
}

export interface Expense {
  id: string
  name: string
  amount: number
  payerId: string
  participantIds: string[]
}

export interface Settlement {
  fromId: string
  toId: string
  amount: number
}

export interface PersonBalance {
  personId: string
  balance: number
}

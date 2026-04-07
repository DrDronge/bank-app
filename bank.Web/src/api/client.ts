import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

export interface Transaction {
  id: number
  date: string
  category: string
  subcategory: string
  text: string
  amount: number
  balance: number
  status: string
  reconciled: boolean
  importedAt: string
  bankAccountId: number | null
}

export interface PagedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface DashboardSummary {
  from: string
  to: string
  totalIncome: number
  totalExpenses: number
  netAmount: number
  currentBalance: number
  transactionCount: number
}

export interface CategorySpending {
  category: string
  amount: number
  percentage: number
}

export interface MonthlyTrend {
  year: number
  month: number
  label: string
  income: number
  expenses: number
  net: number
}

export interface DailyBalance {
  date: string
  balance: number
}

export interface DataRange {
  hasData: boolean
  first: string | null
  last: string | null
}

export interface BankAccount {
  id: number
  name: string
  type: string
  color: string
  createdAt: string
}

export interface RecurringExpense {
  id: number
  name: string
  amount: number
  frequencyMonths: number
  category: string | null
  notes: string | null
  matchText: string | null
  endDate: string | null        // final payment month — null means ongoing
  remainingMonths: number | null
  createdAt: string
  monthlyEquivalent: number
  annualEquivalent: number
}

// Dashboard
export const getDashboardSummary = (from?: string, to?: string, accountId?: number | null) =>
  api.get<DashboardSummary>('/dashboard/summary', { params: { from, to, accountId: accountId ?? undefined } }).then(r => r.data)

export const getCategorySpending = (from?: string, to?: string, accountId?: number | null) =>
  api.get<CategorySpending[]>('/dashboard/categories', { params: { from, to, accountId: accountId ?? undefined } }).then(r => r.data)

export const getMonthlyTrends = (from?: string, to?: string, accountId?: number | null) =>
  api.get<MonthlyTrend[]>('/dashboard/monthly-trends', { params: { from, to, accountId: accountId ?? undefined } }).then(r => r.data)

export const getBalanceHistory = (from?: string, to?: string, accountId?: number | null) =>
  api.get<DailyBalance[]>('/dashboard/balance-history', { params: { from, to, accountId: accountId ?? undefined } }).then(r => r.data)

export const getDataRange = (accountId?: number | null) =>
  api.get<DataRange>('/dashboard/data-range', { params: { accountId: accountId ?? undefined } }).then(r => r.data)

export const deleteAllTransactions = () =>
  api.delete('/transactions').then(r => r.data)

// Transactions
export const getTransactions = (params: {
  page?: number
  pageSize?: number
  search?: string
  category?: string
  from?: string
  to?: string
  type?: string
  accountId?: number | null
  sortBy?: string
  sortDesc?: boolean
}) => {
  const p = { ...params, accountId: params.accountId ?? undefined }
  return api.get<PagedResult<Transaction>>('/transactions', { params: p }).then(r => r.data)
}

export const getCategories = () =>
  api.get<string[]>('/transactions/categories').then(r => r.data)

// Upload
export const uploadCsv = (file: File, accountId?: number | null) => {
  const form = new FormData()
  form.append('file', file)
  const params: Record<string, string> = {}
  if (accountId != null) params['accountId'] = String(accountId)
  return api.post<{ message: string; imported: number; skipped: number; detectedFormat: string }>(
    '/upload',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' }, params }
  ).then(r => r.data)
}

// Export — authenticated download via axios (required since Bearer token can't be sent via <a href>)
export const exportCsv = async (params: {
  search?: string
  category?: string
  from?: string
  to?: string
  type?: string
  accountId?: number | null
}) => {
  const clean: Record<string, string> = {}
  Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') clean[k] = String(v) })
  const resp = await api.get('/transactions/export', { params: clean, responseType: 'blob' })
  const url = URL.createObjectURL(resp.data)
  const a = document.createElement('a')
  a.href = url
  a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Bank Accounts
export const getAccounts = () =>
  api.get<BankAccount[]>('/accounts').then(r => r.data)

export const createAccount = (data: { name: string; type: string; color: string }) =>
  api.post<BankAccount>('/accounts', data).then(r => r.data)

export const deleteAccount = (id: number) =>
  api.delete(`/accounts/${id}`)

// Recurring Expenses
export const getRecurring = () =>
  api.get<RecurringExpense[]>('/recurring').then(r => r.data)

export const createRecurring = (data: {
  name: string
  amount: number
  frequencyMonths: number
  category?: string | null
  notes?: string | null
  matchText?: string | null
  endDate?: string | null
}) => api.post<RecurringExpense>('/recurring', data).then(r => r.data)

export const updateRecurring = (id: number, data: {
  name: string
  amount: number
  frequencyMonths: number
  category?: string | null
  notes?: string | null
  matchText?: string | null
  endDate?: string | null
}) => api.put<RecurringExpense>(`/recurring/${id}`, data).then(r => r.data)

export interface RecurringCandidate {
  text: string
  monthCount: number
  averageAmount: number
  suggestedFrequencyMonths: number
  lastSeen: string
}

export const getRecurringCandidates = (from: string, to: string, accountId: number) =>
  api.get<RecurringCandidate[]>('/transactions/recurring-candidates', {
    params: { from, to, accountId },
  }).then(r => r.data)

export const getMatchedTotal = (matchText: string, from: string, to: string, accountId: number | null) =>
  api.get<{ total: number }>('/transactions/matched-total', {
    params: { matchText, from, to, accountId: accountId ?? undefined },
  }).then(r => r.data.total)

export interface MonthlyAmount {
  year: number
  month: number
  amount: number
}

export const getMonthlyByText = (matchText: string, from: string, to: string, accountId: number | null) =>
  api.get<MonthlyAmount[]>('/transactions/monthly-by-text', {
    params: { matchText, from, to, accountId: accountId ?? undefined },
  }).then(r => r.data)

export const deleteRecurring = (id: number) =>
  api.delete(`/recurring/${id}`)

export default api

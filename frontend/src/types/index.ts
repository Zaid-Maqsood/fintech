export interface User {
  id: string
  email: string
  full_name: string
  phone?: string
  country: string
  currency_preference: string
  timezone: string
  role: 'user' | 'admin'
  kyc_status: 'pending' | 'verified' | 'rejected' | 'not_submitted'
  aml_status: 'clear' | 'flagged' | 'under_review'
  account_status: 'active' | 'inactive' | 'suspended'
  risk_level: 'low' | 'medium' | 'high'
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface Account {
  id: string
  user_id: string
  name: string
  type: 'checking' | 'savings' | 'wallet' | 'investment'
  balance: number
  currency: string
  status: 'active' | 'inactive' | 'frozen'
  account_number?: string
  created_at: string
}

export interface TransactionCategory {
  id: string
  name: string
  type: 'income' | 'expense' | 'transfer'
  icon?: string
  color?: string
}

export interface Transaction {
  id: string
  user_id: string
  account_id?: string
  category_id?: string
  category?: TransactionCategory
  type: 'income' | 'expense' | 'transfer'
  amount: number
  currency: string
  description?: string
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  payment_method?: string
  reference_id?: string
  risk_score: number
  is_flagged: boolean
  compliance_notes?: string
  tags?: string[]
  transaction_date: string
  created_at: string
}

export interface Budget {
  id: string
  user_id: string
  name: string
  month: number
  year: number
  total_limit: number
  notes?: string
  categories?: BudgetCategory[]
  total_spent?: number
  created_at: string
}

export interface BudgetCategory {
  id: string
  budget_id: string
  category_id?: string
  category_name: string
  limit_amount: number
  spent_amount: number
}

export interface Payment {
  id: string
  sender_id: string
  receiver_id: string
  // Flat fields from backend JOIN
  sender_name?: string
  sender_email?: string
  receiver_name?: string
  receiver_email?: string
  // Nested aliases (for compatibility)
  sender?: { full_name: string; email: string }
  receiver?: { full_name: string; email: string }
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  reference_id: string
  description?: string
  payment_date: string
  completed_at?: string
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  data?: Record<string, unknown>
  is_read: boolean
  created_at: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface AnalyticsOverview {
  totalBalance: number
  availableBalance: number
  monthlyIncome: number
  monthlyExpenses: number
  savings: number
  transactionCount: number
}

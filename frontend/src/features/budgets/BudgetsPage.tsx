import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Plus,
  Trash2,
  Pencil,
  PiggyBank,
  ChevronDown,
  X,
  AlertTriangle,
  Calendar,
  Target,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn, formatCurrency } from '@/lib/utils'
import api from '@/lib/api'
import type { Budget, BudgetCategory } from '@/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function getMonthName(month: number): string {
  return MONTHS[month - 1] ?? ''
}

function usagePct(spent: number, limit: number): number {
  if (limit <= 0) return 0
  return Math.min(Math.round((spent / limit) * 100), 100)
}

function progressColor(pct: number): string {
  if (pct >= 80) return 'bg-rose-500'
  if (pct >= 50) return 'bg-amber-400'
  return 'bg-emerald-500'
}

function progressTrackColor(pct: number): string {
  if (pct >= 80) return 'bg-rose-100 dark:bg-rose-950/30'
  if (pct >= 50) return 'bg-amber-100 dark:bg-amber-950/30'
  return 'bg-emerald-100 dark:bg-emerald-950/30'
}

function progressTextColor(pct: number): string {
  if (pct >= 80) return 'text-rose-600'
  if (pct >= 50) return 'text-amber-500'
  return 'text-emerald-600'
}

// ---------------------------------------------------------------------------
// CategoryRow — one editable row inside the Create/Edit form
// ---------------------------------------------------------------------------
interface CategoryRowData {
  id: string
  category_name: string
  limit_amount: string
}

interface CategoryRowProps {
  row: CategoryRowData
  onChange: (id: string, field: keyof CategoryRowData, value: string) => void
  onRemove: (id: string) => void
  canRemove: boolean
}

function CategoryRow({ row, onChange, onRemove, canRemove }: CategoryRowProps) {
  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Category name (e.g. Groceries)"
        value={row.category_name}
        onChange={(e) => onChange(row.id, 'category_name', e.target.value)}
        className="flex-1"
      />
      <Input
        type="number"
        placeholder="Limit ($)"
        value={row.limit_amount}
        onChange={(e) => onChange(row.id, 'limit_amount', e.target.value)}
        className="w-28"
        min="0"
        step="0.01"
      />
      {canRemove && (
        <button
          type="button"
          onClick={() => onRemove(row.id)}
          className="text-muted-foreground hover:text-rose-500 transition-colors p-1"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// CircularProgress — SVG ring used in the current-month hero card
// ---------------------------------------------------------------------------
function CircularProgress({ pct, size = 120 }: { pct: number; size?: number }) {
  const radius = (size - 16) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (pct / 100) * circumference
  const stroke = pct >= 80 ? '#f43f5e' : pct >= 50 ? '#f59e0b' : '#10b981'

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="hsl(var(--border))"
        strokeWidth={10}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={stroke}
        strokeWidth={10}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// CurrentBudgetCard — big hero card for the current month budget
// ---------------------------------------------------------------------------
function CurrentBudgetCard({ budget }: { budget: Budget }) {
  const spent = budget.categories?.reduce((sum, c) => sum + Number(c.spent_amount ?? 0), 0) ?? 0
  const limit = Number(budget.total_limit)
  const pct = usagePct(spent, limit)
  const remaining = limit - spent

  return (
    <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-0 shadow-md overflow-hidden">
        {/* Gradient header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-blue-100 text-sm font-medium mb-1">Current Month Budget</p>
              <h3 className="text-2xl font-bold">{budget.name}</h3>
              <p className="text-blue-200 text-sm mt-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {getMonthName(budget.month)} {budget.year}
              </p>
            </div>

            {/* Circular progress */}
            <div className="relative flex-shrink-0">
              <CircularProgress pct={pct} size={110} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold">{pct}%</span>
                <span className="text-xs text-blue-200">used</span>
              </div>
            </div>
          </div>

          {/* Wide progress bar */}
          <div className="mt-5">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-blue-100">
                Spent: <strong className="text-white">{formatCurrency(spent)}</strong>
              </span>
              <span className="text-blue-100">
                Limit: <strong className="text-white">{formatCurrency(limit)}</strong>
              </span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2.5">
              <div
                className={cn(
                  'h-2.5 rounded-full transition-all duration-700',
                  pct >= 80 ? 'bg-rose-400' : pct >= 50 ? 'bg-amber-300' : 'bg-emerald-400',
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Remaining callout */}
        <CardContent className="p-4 bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="w-4 h-4" />
              Remaining budget
            </div>
            <span
              className={cn(
                'text-lg font-bold',
                remaining < 0 ? 'text-rose-600' : 'text-emerald-600',
              )}
            >
              {remaining < 0 ? '-' : ''}
              {formatCurrency(Math.abs(remaining))}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// BudgetCategoryCard — mini card in the categories grid
// ---------------------------------------------------------------------------
function BudgetCategoryCard({ cat, index }: { cat: BudgetCategory; index: number }) {
  const spent = Number(cat.spent_amount ?? 0)
  const limit = Number(cat.limit_amount)
  const pct = usagePct(spent, limit)
  const remaining = limit - spent

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-semibold text-sm">{cat.category_name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatCurrency(spent)} of {formatCurrency(limit)}
              </p>
            </div>
            <span
              className={cn(
                'text-xs font-semibold px-2 py-0.5 rounded-full',
                pct >= 80
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                  : pct >= 50
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
              )}
            >
              {pct}%
            </span>
          </div>

          {/* Custom progress bar with color */}
          <div className={cn('w-full rounded-full h-1.5', progressTrackColor(pct))}>
            <div
              className={cn('h-1.5 rounded-full transition-all duration-500', progressColor(pct))}
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="flex justify-between mt-2 text-xs">
            <span className="text-muted-foreground">Remaining</span>
            <span className={cn('font-medium', progressTextColor(pct))}>
              {remaining < 0 ? `Over by ${formatCurrency(Math.abs(remaining))}` : formatCurrency(remaining)}
            </span>
          </div>

          {pct >= 80 && (
            <div className="flex items-center gap-1 mt-2 text-xs text-rose-600">
              <AlertTriangle className="w-3 h-3" />
              Approaching limit
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// PastBudgetCard — smaller card for previous months
// ---------------------------------------------------------------------------
function PastBudgetCard({
  budget,
  onEdit,
  onDelete,
}: {
  budget: Budget
  onEdit: (b: Budget) => void
  onDelete: (id: string) => void
}) {
  const spent = budget.categories?.reduce((sum, c) => sum + Number(c.spent_amount ?? 0), 0) ?? 0
  const limit = Number(budget.total_limit)
  const pct = usagePct(spent, limit)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3 gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{budget.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {getMonthName(budget.month)} {budget.year}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => onEdit(budget)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(budget.id)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">
              {formatCurrency(spent)} / {formatCurrency(limit)}
            </span>
            <span className={cn('font-semibold text-xs', progressTextColor(pct))}>{pct}%</span>
          </div>

          <div className={cn('w-full rounded-full h-1.5', progressTrackColor(pct))}>
            <div
              className={cn('h-1.5 rounded-full transition-all duration-500', progressColor(pct))}
              style={{ width: `${pct}%` }}
            />
          </div>

          {budget.categories && budget.categories.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              {budget.categories.length} categor{budget.categories.length === 1 ? 'y' : 'ies'}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// BudgetFormDialog — create / edit
// ---------------------------------------------------------------------------
interface BudgetFormDialogProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editBudget?: Budget | null
}

function BudgetFormDialog({ open, onClose, onSaved, editBudget }: BudgetFormDialogProps) {
  const currentDate = new Date()
  const [name, setName] = useState('')
  const [month, setMonth] = useState(String(currentDate.getMonth() + 1))
  const [year, setYear] = useState(String(currentDate.getFullYear()))
  const [totalLimit, setTotalLimit] = useState('')
  const [categoryRows, setCategoryRows] = useState<CategoryRowData[]>([
    { id: crypto.randomUUID(), category_name: '', limit_amount: '' },
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Populate form when editing
  useEffect(() => {
    if (editBudget) {
      setName(editBudget.name)
      setMonth(String(editBudget.month))
      setYear(String(editBudget.year))
      setTotalLimit(String(editBudget.total_limit))
      if (editBudget.categories && editBudget.categories.length > 0) {
        setCategoryRows(
          editBudget.categories.map((c) => ({
            id: c.id,
            category_name: c.category_name,
            limit_amount: String(c.limit_amount),
          })),
        )
      } else {
        setCategoryRows([{ id: crypto.randomUUID(), category_name: '', limit_amount: '' }])
      }
    } else {
      setName('')
      setMonth(String(currentDate.getMonth() + 1))
      setYear(String(currentDate.getFullYear()))
      setTotalLimit('')
      setCategoryRows([{ id: crypto.randomUUID(), category_name: '', limit_amount: '' }])
    }
    setError('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editBudget, open])

  function addRow() {
    setCategoryRows((prev) => [
      ...prev,
      { id: crypto.randomUUID(), category_name: '', limit_amount: '' },
    ])
  }

  function updateRow(id: string, field: keyof CategoryRowData, value: string) {
    setCategoryRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    )
  }

  function removeRow(id: string) {
    setCategoryRows((prev) => prev.filter((r) => r.id !== id))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError('Budget name is required.')
    if (!totalLimit || isNaN(Number(totalLimit)) || Number(totalLimit) <= 0)
      return setError('Please enter a valid total limit.')

    const validCategories = categoryRows.filter(
      (r) => r.category_name.trim() && r.limit_amount && Number(r.limit_amount) > 0,
    )

    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        month: Number(month),
        year: Number(year),
        totalLimit: Number(totalLimit),
        categories: validCategories.map((r) => ({
          categoryName: r.category_name.trim(),
          limitAmount: Number(r.limit_amount),
        })),
      }

      if (editBudget) {
        await api.put(`/budgets/${editBudget.id}`, payload)
      } else {
        await api.post('/budgets', payload)
      }
      onSaved()
      onClose()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to save budget.'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const years = Array.from({ length: 5 }, (_, i) => String(currentDate.getFullYear() - 1 + i))

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editBudget ? 'Edit Budget' : 'Create New Budget'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="budget-name">Budget Name</Label>
            <Input
              id="budget-name"
              placeholder="e.g. Monthly Household Budget"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Month + Year */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Month</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={m} value={String(i + 1)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Year</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Total limit */}
          <div className="space-y-1.5">
            <Label htmlFor="total-limit">Total Budget Limit ($)</Label>
            <Input
              id="total-limit"
              type="number"
              placeholder="e.g. 3000"
              value={totalLimit}
              onChange={(e) => setTotalLimit(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>

          {/* Category rows */}
          <div className="space-y-2">
            <Label>Budget Categories (optional)</Label>
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {categoryRows.map((row) => (
                  <motion.div
                    key={row.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <CategoryRow
                      row={row}
                      onChange={updateRow}
                      onRemove={removeRow}
                      canRemove={categoryRows.length > 1}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addRow} className="w-full gap-1">
              <Plus className="w-3.5 h-3.5" /> Add Category
            </Button>
          </div>

          {error && (
            <p className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-950/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : editBudget ? 'Save Changes' : 'Create Budget'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// DeleteConfirmDialog
// ---------------------------------------------------------------------------
function DeleteConfirmDialog({
  open,
  onClose,
  onConfirm,
  budgetName,
  deleting,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  budgetName: string
  deleting: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Budget</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete <strong>{budgetName}</strong>? This action cannot be
          undone.
        </p>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// BudgetsPage
// ---------------------------------------------------------------------------
export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [currentBudget, setCurrentBudget] = useState<Budget | null>(null)
  const [loading, setLoading] = useState(true)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Budget | null>(null)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState('')
  const [deleting, setDeleting] = useState(false)

  const [showAllCategories, setShowAllCategories] = useState(false)

  async function loadData() {
    setLoading(true)
    try {
      const [allRes, currRes] = await Promise.all([
        api.get('/budgets'),
        api.get('/budgets/current'),
      ])
      setBudgets(allRes.data ?? [])
      setCurrentBudget(currRes.data ?? null)
    } catch (e) {
      console.error(e)
      setBudgets([])
      setCurrentBudget(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function openCreate() {
    setEditTarget(null)
    setDialogOpen(true)
  }

  function openEdit(budget: Budget) {
    setEditTarget(budget)
    setDialogOpen(true)
  }

  function promptDelete(id: string, name: string) {
    setDeleteId(id)
    setDeleteName(name)
  }

  async function confirmDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      await api.delete(`/budgets/${deleteId}`)
      setDeleteId(null)
      setDeleteName('')
      await loadData()
    } catch (e) {
      console.error(e)
    } finally {
      setDeleting(false)
    }
  }

  // Separate current month budget from past budgets in the full list
  const now = new Date()
  const pastBudgets = budgets.filter(
    (b) => !(b.month === now.getMonth() + 1 && b.year === now.getFullYear()),
  )

  // Categories to display for the current budget (collapse to 6 if many)
  const currentCategories = currentBudget?.categories ?? []
  const visibleCategories = showAllCategories
    ? currentCategories
    : currentCategories.slice(0, 6)

  // Empty state
  const isEmpty = !loading && !currentBudget && pastBudgets.length === 0

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* Top bar                                                             */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold">Budgets</h2>
          <p className="text-muted-foreground text-sm">Track your spending against your budget goals</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Budget
        </Button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Loading skeletons                                                   */}
      {/* ------------------------------------------------------------------ */}
      {loading && (
        <div className="space-y-6">
          <Skeleton className="h-56 w-full rounded-2xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Empty state                                                         */}
      {/* ------------------------------------------------------------------ */}
      {isEmpty && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <div className="w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center mb-5">
            <PiggyBank className="w-10 h-10 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No budgets yet</h3>
          <p className="text-muted-foreground text-sm max-w-xs mb-6">
            Create your first budget to start tracking your spending by category.
          </p>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Budget
          </Button>
        </motion.div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Current month budget hero card                                      */}
      {/* ------------------------------------------------------------------ */}
      {!loading && currentBudget && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-base">Current Month</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => openEdit(currentBudget)} className="gap-1.5">
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => promptDelete(currentBudget.id, currentBudget.name)}
                className="gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-800"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </Button>
            </div>
          </div>

          <CurrentBudgetCard budget={currentBudget} />

          {/* Category grid */}
          {currentCategories.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                Category Breakdown
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                <AnimatePresence initial={false}>
                  {visibleCategories.map((cat, i) => (
                    <BudgetCategoryCard key={cat.id} cat={cat} index={i} />
                  ))}
                </AnimatePresence>
              </div>
              {currentCategories.length > 6 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 gap-1 text-blue-600"
                  onClick={() => setShowAllCategories((p) => !p)}
                >
                  {showAllCategories ? 'Show less' : `Show ${currentCategories.length - 6} more`}
                  <ChevronDown
                    className={cn('w-3.5 h-3.5 transition-transform', showAllCategories && 'rotate-180')}
                  />
                </Button>
              )}
            </div>
          )}
        </>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Past budgets                                                        */}
      {/* ------------------------------------------------------------------ */}
      {!loading && pastBudgets.length > 0 && (
        <div>
          <h3 className="font-semibold text-base mb-4">Past Budgets</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence initial={false}>
              {pastBudgets.map((b) => (
                <PastBudgetCard
                  key={b.id}
                  budget={b}
                  onEdit={openEdit}
                  onDelete={(id) => promptDelete(id, b.name)}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Dialogs                                                             */}
      {/* ------------------------------------------------------------------ */}
      <BudgetFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={loadData}
        editBudget={editTarget}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onClose={() => {
          setDeleteId(null)
          setDeleteName('')
        }}
        onConfirm={confirmDelete}
        budgetName={deleteName}
        deleting={deleting}
      />
    </div>
  )
}

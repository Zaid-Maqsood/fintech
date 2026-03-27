import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Search,
  Users,
  ChevronLeft,
  ChevronRight,
  Eye,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  Clock,
  UserX,
  UserCheck,
  AlertCircle,
  X,
  CreditCard,
  FileText,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatCurrency, formatDate, formatRelativeTime, cn, getInitials } from '@/lib/utils'
import api from '@/lib/api'
import type { User, Transaction, Account } from '@/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function KycBadge({ status }: { status: User['kyc_status'] }) {
  const map: Record<User['kyc_status'], { label: string; className: string }> = {
    verified: { label: 'Verified', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
    pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800' },
    rejected: { label: 'Rejected', className: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800' },
    not_submitted: { label: 'Not Submitted', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700' },
  }
  const cfg = map[status]
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border', cfg.className)}>
      {cfg.label}
    </span>
  )
}

function AmlBadge({ status }: { status: User['aml_status'] }) {
  const map: Record<User['aml_status'], { label: string; className: string }> = {
    clear: { label: 'Clear', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
    flagged: { label: 'Flagged', className: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800' },
    under_review: { label: 'Under Review', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
  }
  const cfg = map[status]
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border', cfg.className)}>
      {cfg.label}
    </span>
  )
}

function AccountStatusBadge({ status }: { status: User['account_status'] }) {
  const map: Record<User['account_status'], { label: string; className: string }> = {
    active: { label: 'Active', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
    inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700' },
    suspended: { label: 'Suspended', className: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800' },
  }
  const cfg = map[status]
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border', cfg.className)}>
      {cfg.label}
    </span>
  )
}

function RoleBadge({ role }: { role: User['role'] }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border',
      role === 'admin'
        ? 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400 border-violet-200 dark:border-violet-800'
        : 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    )}>
      {role === 'admin' ? 'Admin' : 'User'}
    </span>
  )
}

function RiskBadge({ level }: { level: User['risk_level'] }) {
  const map: Record<User['risk_level'], { label: string; className: string }> = {
    low: { label: 'Low', className: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400' },
    medium: { label: 'Medium', className: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400' },
    high: { label: 'High', className: 'text-rose-600 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-400' },
  }
  const cfg = map[level]
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', cfg.className)}>
      {cfg.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// User Detail Sheet
// ---------------------------------------------------------------------------
interface UserDetailSheetProps {
  userId: string | null
  onClose: () => void
  onStatusToggled: (userId: string, newStatus: User['account_status']) => void
}

function UserDetailSheet({ userId, onClose, onStatusToggled }: UserDetailSheetProps) {
  const [user, setUser] = useState<User | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    if (!userId) return
    const fetch = async () => {
      setLoadingDetail(true)
      setUser(null)
      setAccounts([])
      setTransactions([])
      try {
        const res = await api.get(`/admin/users/${userId}`)
        const data = res.data
        setUser(data.user ?? data)
        setAccounts(data.accounts ?? [])
        setTransactions(data.recentTransactions ?? data.transactions ?? [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoadingDetail(false)
      }
    }
    fetch()
  }, [userId])

  const toggleStatus = async () => {
    if (!user) return
    setToggling(true)
    const newStatus: User['account_status'] = user.account_status === 'active' ? 'suspended' : 'active'
    try {
      await api.put(`/admin/users/${user.id}/status`, { status: newStatus })
      setUser(prev => prev ? { ...prev, account_status: newStatus } : prev)
      onStatusToggled(user.id, newStatus)
      setConfirmOpen(false)
    } catch (e) {
      console.error(e)
    } finally {
      setToggling(false)
    }
  }

  const kycIcon = user
    ? user.kyc_status === 'verified'
      ? <ShieldCheck className="h-5 w-5 text-emerald-500" />
      : user.kyc_status === 'rejected'
        ? <ShieldAlert className="h-5 w-5 text-rose-500" />
        : <ShieldOff className="h-5 w-5 text-gray-400" />
    : null

  return (
    <>
      <Sheet open={!!userId} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-full sm:max-w-xl p-0" side="right">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <SheetTitle className="text-lg font-semibold">User Details</SheetTitle>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-80px)]">
            <div className="px-6 py-5 space-y-6">
              {loadingDetail ? (
                <div className="space-y-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-40 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : !user ? (
                <div className="text-center py-16 text-muted-foreground">
                  <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>User not found</p>
                </div>
              ) : (
                <>
                  {/* Profile */}
                  <div className="flex items-start gap-4">
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xl font-bold">{getInitials(user.full_name)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-foreground truncate">{user.full_name}</h3>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      {user.phone && <p className="text-sm text-muted-foreground">{user.phone}</p>}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <RoleBadge role={user.role} />
                        <AccountStatusBadge status={user.account_status} />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Profile Details */}
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3">Profile Information</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Country', value: user.country || '—' },
                        { label: 'Currency', value: user.currency_preference || '—' },
                        { label: 'Timezone', value: user.timezone || '—' },
                        { label: 'Joined', value: formatDate(user.created_at) },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-muted/50 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="text-sm font-medium text-foreground mt-0.5 truncate">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Compliance */}
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      {kycIcon}
                      Compliance
                    </h4>
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between py-2 border-b border-border/50">
                        <span className="text-sm text-muted-foreground">KYC Status</span>
                        <KycBadge status={user.kyc_status} />
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-border/50">
                        <span className="text-sm text-muted-foreground">AML Status</span>
                        <AmlBadge status={user.aml_status} />
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-muted-foreground">Risk Level</span>
                        <RiskBadge level={user.risk_level} />
                      </div>
                    </div>
                  </div>

                  {/* Accounts Summary */}
                  {accounts.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          Accounts ({accounts.length})
                        </h4>
                        <div className="space-y-2">
                          {accounts.map(acc => (
                            <div key={acc.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                              <div>
                                <p className="text-sm font-medium">{acc.name}</p>
                                <p className="text-xs text-muted-foreground capitalize">{acc.type}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold">{formatCurrency(Number(acc.balance), acc.currency)}</p>
                                <p className={cn('text-xs', acc.status === 'active' ? 'text-emerald-600' : 'text-muted-foreground')}>
                                  {acc.status}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Recent Transactions */}
                  {transactions.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          Recent Transactions
                        </h4>
                        <div className="space-y-2">
                          {transactions.slice(0, 5).map(txn => (
                            <div key={txn.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                              <div>
                                <p className="text-sm font-medium truncate max-w-[200px]">
                                  {txn.description || txn.reference_id || 'Transaction'}
                                </p>
                                <p className="text-xs text-muted-foreground">{formatRelativeTime(txn.transaction_date)}</p>
                              </div>
                              <span className={cn(
                                'text-sm font-semibold',
                                txn.type === 'income' ? 'text-emerald-600' : 'text-rose-600',
                              )}>
                                {txn.type === 'income' ? '+' : '-'}{formatCurrency(Number(txn.amount), txn.currency)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <Separator />

                  {/* Actions */}
                  <div className="pb-4">
                    <Button
                      variant={user.account_status === 'active' ? 'destructive' : 'default'}
                      className="w-full gap-2"
                      onClick={() => setConfirmOpen(true)}
                    >
                      {user.account_status === 'active' ? (
                        <>
                          <UserX className="h-4 w-4" />
                          Suspend Account
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-4 w-4" />
                          Activate Account
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {user?.account_status === 'active' ? 'Suspend User Account' : 'Activate User Account'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {user?.account_status === 'active'
              ? `Are you sure you want to suspend ${user?.full_name}'s account? They will lose access to the platform.`
              : `Are you sure you want to activate ${user?.full_name}'s account? They will regain access to the platform.`}
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={user?.account_status === 'active' ? 'destructive' : 'default'}
              onClick={toggleStatus}
              disabled={toggling}
            >
              {toggling ? 'Processing...' : user?.account_status === 'active' ? 'Suspend' : 'Activate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ---------------------------------------------------------------------------
// AdminUsersPage
// ---------------------------------------------------------------------------
export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [kycFilter, setKycFilter] = useState('all')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(kycFilter !== 'all' && { kyc_status: kycFilter }),
      })
      const res = await api.get(`/admin/users?${params}`)
      const d = res.data
      setUsers(d.data ?? d)
      const tot = d.pagination?.total ?? d.total ?? (d.data ?? d).length
      setTotal(tot)
      setTotalPages(d.pagination?.pages ?? d.totalPages ?? Math.ceil(tot / 10))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, statusFilter, kycFilter])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Reset page on filter change
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, statusFilter, kycFilter])

  const handleStatusToggled = (userId: string, newStatus: User['account_status']) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, account_status: newStatus } : u))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">User Management</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage platform users, KYC status, and account access</p>
      </motion.div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-44 h-9">
                  <SelectValue placeholder="Account Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
              <Select value={kycFilter} onValueChange={setKycFilter}>
                <SelectTrigger className="w-full sm:w-44 h-9">
                  <SelectValue placeholder="KYC Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All KYC</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="not_submitted">Not Submitted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Users
            </CardTitle>
            <span className="text-sm text-muted-foreground">{total.toLocaleString()} total</span>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="px-6 pb-6 space-y-3 pt-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : users.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-16 text-muted-foreground px-6"
              >
                <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No users found</p>
                <p className="text-sm mt-1">Try adjusting your search or filters</p>
                {(search || statusFilter !== 'all' || kycFilter !== 'all') && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => {
                      setSearch('')
                      setStatusFilter('all')
                      setKycFilter('all')
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </motion.div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs font-semibold">User</TableHead>
                      <TableHead className="text-xs font-semibold">Role</TableHead>
                      <TableHead className="text-xs font-semibold">KYC Status</TableHead>
                      <TableHead className="text-xs font-semibold">Account Status</TableHead>
                      <TableHead className="text-xs font-semibold">Risk</TableHead>
                      <TableHead className="text-xs font-semibold">Joined</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence mode="popLayout">
                      {users.map((user, i) => (
                        <motion.tr
                          key={user.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ delay: i * 0.04 }}
                          className="group hover:bg-muted/40 transition-colors cursor-pointer"
                          onClick={() => setSelectedUserId(user.id)}
                        >
                          <TableCell className="py-3.5">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 flex-shrink-0">
                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-violet-500 text-white text-xs font-bold">
                                  {getInitials(user.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate max-w-[160px]">{user.full_name}</p>
                                <p className="text-xs text-muted-foreground truncate max-w-[160px]">{user.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3.5">
                            <RoleBadge role={user.role} />
                          </TableCell>
                          <TableCell className="py-3.5">
                            <KycBadge status={user.kyc_status} />
                          </TableCell>
                          <TableCell className="py-3.5">
                            <AccountStatusBadge status={user.account_status} />
                          </TableCell>
                          <TableCell className="py-3.5">
                            <RiskBadge level={user.risk_level} />
                          </TableCell>
                          <TableCell className="py-3.5">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                              <Clock className="h-3 w-3 flex-shrink-0" />
                              {formatDate(user.created_at)}
                            </div>
                          </TableCell>
                          <TableCell className="py-3.5 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={e => {
                                e.stopPropagation()
                                setSelectedUserId(user.id)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {!loading && users.length > 0 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-border/50">
                <p className="text-sm text-muted-foreground">
                  Showing {(page - 1) * 10 + 1}–{Math.min(page * 10, total)} of {total.toLocaleString()}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium text-foreground px-2">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Detail Sheet */}
      <UserDetailSheet
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
        onStatusToggled={handleStatusToggled}
      />
    </div>
  )
}

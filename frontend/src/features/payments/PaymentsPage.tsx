import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  ChevronRight,
  User,
  DollarSign,
  FileText,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import type { Payment } from '@/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RecipientOption {
  id: string
  full_name: string
  email: string
}

type SendStep = 'form' | 'confirm' | 'processing' | 'result'

interface SendResult {
  success: boolean
  payment?: Payment
  errorMessage?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusConfig(status: Payment['status']) {
  switch (status) {
    case 'completed':
      return {
        label: 'Completed',
        icon: CheckCircle2,
        badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
        iconClass: 'text-emerald-500',
      }
    case 'pending':
      return {
        label: 'Pending',
        icon: Clock,
        badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
        iconClass: 'text-amber-500',
      }
    case 'failed':
      return {
        label: 'Failed',
        icon: XCircle,
        badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
        iconClass: 'text-rose-500',
      }
    case 'cancelled':
      return {
        label: 'Cancelled',
        icon: Ban,
        badgeClass: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
        iconClass: 'text-gray-400',
      }
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function extractRecipients(payments: Payment[], currentUserId: string): RecipientOption[] {
  const seen = new Map<string, RecipientOption>()
  for (const p of payments) {
    const rName = p.receiver_name ?? p.receiver?.full_name
    const rEmail = p.receiver_email ?? p.receiver?.email
    if (p.receiver_id !== currentUserId && rName && rEmail && !seen.has(p.receiver_id)) {
      seen.set(p.receiver_id, { id: p.receiver_id, full_name: rName, email: rEmail })
    }
    const sName = p.sender_name ?? p.sender?.full_name
    const sEmail = p.sender_email ?? p.sender?.email
    if (p.sender_id !== currentUserId && sName && sEmail && !seen.has(p.sender_id)) {
      seen.set(p.sender_id, { id: p.sender_id, full_name: sName, email: sEmail })
    }
  }
  return Array.from(seen.values())
}

// ---------------------------------------------------------------------------
// StatusBadge
// ---------------------------------------------------------------------------
function StatusBadge({ status }: { status: Payment['status'] }) {
  const cfg = statusConfig(status)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
        cfg.badgeClass,
      )}
    >
      <cfg.icon className="w-3 h-3" />
      {cfg.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// AvatarCircle
// ---------------------------------------------------------------------------
function AvatarCircle({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-14 h-14 text-lg' : 'w-10 h-10 text-sm'
  return (
    <div
      className={cn(
        'rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold flex-shrink-0',
        sizeClass,
      )}
    >
      {getInitials(name)}
    </div>
  )
}

// ---------------------------------------------------------------------------
// PaymentDetailSheet
// ---------------------------------------------------------------------------
function PaymentDetailSheet({
  payment,
  currentUserId,
  onClose,
}: {
  payment: Payment | null
  currentUserId: string
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)

  function copyRef() {
    if (!payment) return
    navigator.clipboard.writeText(payment.reference_id).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (!payment) return null

  const isSender = payment.sender_id === currentUserId
  const counterparty = isSender ? payment.receiver : payment.sender
  const cfg = statusConfig(payment.status)

  return (
    <Sheet open={!!payment} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Payment Details</SheetTitle>
        </SheetHeader>

        {/* Amount + status hero */}
        <div className="flex flex-col items-center py-6 bg-muted/40 rounded-2xl mb-6">
          <div
            className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center mb-3',
              payment.status === 'completed'
                ? 'bg-emerald-100 dark:bg-emerald-950/30'
                : payment.status === 'failed'
                ? 'bg-rose-100 dark:bg-rose-950/30'
                : 'bg-amber-100 dark:bg-amber-950/30',
            )}
          >
            <cfg.icon className={cn('w-8 h-8', cfg.iconClass)} />
          </div>
          <p
            className={cn(
              'text-3xl font-bold mb-1',
              isSender ? 'text-rose-600' : 'text-emerald-600',
            )}
          >
            {isSender ? '-' : '+'}
            {formatCurrency(Number(payment.amount), payment.currency)}
          </p>
          <StatusBadge status={payment.status} />
        </div>

        {/* Details rows */}
        <div className="space-y-4">
          <DetailRow
            label={isSender ? 'Sent to' : 'Received from'}
            value={counterparty?.full_name ?? 'Unknown'}
            sub={counterparty?.email}
          />
          <Separator />
          <DetailRow label="Reference ID">
            <button
              onClick={copyRef}
              className="flex items-center gap-1.5 text-sm font-mono text-blue-600 hover:text-blue-700 transition-colors"
            >
              {payment.reference_id}
              <Copy className="w-3.5 h-3.5" />
              {copied && <span className="text-xs text-emerald-600">Copied!</span>}
            </button>
          </DetailRow>
          <Separator />
          <DetailRow label="Date" value={formatDate(payment.payment_date)} />
          {payment.completed_at && (
            <>
              <Separator />
              <DetailRow label="Completed at" value={formatDate(payment.completed_at)} />
            </>
          )}
          {payment.description && (
            <>
              <Separator />
              <DetailRow label="Description" value={payment.description} />
            </>
          )}
          <Separator />
          <DetailRow label="Currency" value={payment.currency} />
        </div>
      </SheetContent>
    </Sheet>
  )
}

function DetailRow({
  label,
  value,
  sub,
  children,
}: {
  label: string
  value?: string
  sub?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-sm text-muted-foreground flex-shrink-0">{label}</span>
      {children ?? (
        <div className="text-right">
          <p className="text-sm font-medium">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// SendMoneyDialog — 4-step wizard
// ---------------------------------------------------------------------------
interface SendFormData {
  recipientId: string
  recipientName: string
  recipientEmail: string
  amount: string
  description: string
}

function SendMoneyDialog({
  open,
  onClose,
  onSent,
  knownRecipients,
}: {
  open: boolean
  onClose: () => void
  onSent: () => void
  knownRecipients: RecipientOption[]
}) {
  const { user } = useAuthStore()
  const [step, setStep] = useState<SendStep>('form')
  const [form, setForm] = useState<SendFormData>({
    recipientId: '',
    recipientName: '',
    recipientEmail: '',
    amount: '',
    description: '',
  })
  const [recipientSearch, setRecipientSearch] = useState('')
  const [formError, setFormError] = useState('')
  const [result, setResult] = useState<SendResult | null>(null)

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep('form')
      setForm({ recipientId: '', recipientName: '', recipientEmail: '', amount: '', description: '' })
      setRecipientSearch('')
      setFormError('')
      setResult(null)
    }
  }, [open])

  const filteredRecipients = knownRecipients.filter(
    (r) =>
      r.full_name.toLowerCase().includes(recipientSearch.toLowerCase()) ||
      r.email.toLowerCase().includes(recipientSearch.toLowerCase()),
  )

  function selectRecipient(r: RecipientOption) {
    setForm((prev) => ({ ...prev, recipientId: r.id, recipientName: r.full_name, recipientEmail: r.email }))
    setRecipientSearch('')
  }

  function clearRecipient() {
    setForm((prev) => ({ ...prev, recipientId: '', recipientName: '', recipientEmail: '' }))
  }

  function validateForm(): boolean {
    if (!form.recipientId) {
      setFormError('Please select a recipient.')
      return false
    }
    const amt = Number(form.amount)
    if (!form.amount || isNaN(amt) || amt <= 0) {
      setFormError('Please enter a valid amount.')
      return false
    }
    setFormError('')
    return true
  }

  function goToConfirm() {
    if (validateForm()) setStep('confirm')
  }

  async function sendPayment() {
    setStep('processing')
    // Brief processing delay for UX realism
    await new Promise((resolve) => setTimeout(resolve, 1500))
    try {
      const res = await api.post('/payments/send', {
        receiverId: form.recipientId,
        amount: Number(form.amount),
        description: form.description || undefined,
      })
      setResult({ success: true, payment: res.data })
      setStep('result')
      onSent()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Payment failed. Please try again.'
      setResult({ success: false, errorMessage: msg })
      setStep('result')
    }
  }

  function closeDialog() {
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && closeDialog()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'form' && 'Send Money'}
            {step === 'confirm' && 'Confirm Transfer'}
            {step === 'processing' && 'Processing…'}
            {step === 'result' && (result?.success ? 'Payment Sent!' : 'Payment Failed')}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        {(step === 'form' || step === 'confirm') && (
          <div className="flex items-center gap-2 mb-4">
            {(['form', 'confirm'] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
                    step === s || (s === 'form' && step === 'confirm')
                      ? 'bg-blue-600 text-white'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {i + 1}
                </div>
                <span
                  className={cn(
                    'text-xs font-medium',
                    step === s ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {s === 'form' ? 'Details' : 'Confirm'}
                </span>
                {i === 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
              </div>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* ---- STEP 1: Form ---- */}
          {step === 'form' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Recipient selector */}
              <div className="space-y-1.5">
                <Label>Recipient</Label>
                {form.recipientId ? (
                  <div className="flex items-center gap-3 p-3 border rounded-xl bg-muted/40">
                    <AvatarCircle name={form.recipientName} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{form.recipientName}</p>
                      <p className="text-xs text-muted-foreground truncate">{form.recipientEmail}</p>
                    </div>
                    <button
                      onClick={clearRecipient}
                      className="text-muted-foreground hover:text-foreground p-1"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <Input
                      placeholder="Search by name or email…"
                      value={recipientSearch}
                      onChange={(e) => setRecipientSearch(e.target.value)}
                      className="mb-1"
                    />
                    {recipientSearch.length > 0 && filteredRecipients.length > 0 && (
                      <div className="border rounded-xl bg-card shadow-md max-h-44 overflow-y-auto">
                        {filteredRecipients.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
                            onClick={() => selectRecipient(r)}
                          >
                            <AvatarCircle name={r.full_name} size="sm" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{r.full_name}</p>
                              <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {recipientSearch.length > 0 && filteredRecipients.length === 0 && (
                      <p className="text-xs text-muted-foreground px-1 mt-1">No recipients found.</p>
                    )}
                    {knownRecipients.length > 0 && recipientSearch.length === 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1.5 mt-2">Recent recipients</p>
                        <div className="flex flex-wrap gap-2">
                          {knownRecipients.slice(0, 4).map((r) => (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => selectRecipient(r)}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-full border hover:bg-muted/50 transition-colors text-sm"
                            >
                              <AvatarCircle name={r.full_name} size="sm" />
                              {r.full_name.split(' ')[0]}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {knownRecipients.length === 0 && (
                      <p className="text-xs text-muted-foreground mt-1.5">
                        No recent recipients. Make a payment first or search above.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <Label htmlFor="send-amount">Amount (USD)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="send-amount"
                    type="number"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                    className="pl-9"
                    min="0.01"
                    step="0.01"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="send-desc">
                  Description <span className="text-muted-foreground text-xs">(optional)</span>
                </Label>
                <Textarea
                  id="send-desc"
                  placeholder="What's this payment for?"
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="resize-none"
                />
              </div>

              {formError && (
                <p className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-950/30 rounded-lg px-3 py-2">
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button onClick={goToConfirm} className="gap-2">
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ---- STEP 2: Confirm ---- */}
          {step === 'confirm' && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              {/* Summary card */}
              <div className="bg-muted/40 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> From
                  </span>
                  <div className="text-right">
                    <p className="font-medium">{user?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> To
                  </span>
                  <div className="text-right">
                    <p className="font-medium">{form.recipientName}</p>
                    <p className="text-xs text-muted-foreground">{form.recipientEmail}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5" /> Amount
                  </span>
                  <span className="text-xl font-bold text-blue-600">
                    {formatCurrency(Number(form.amount))}
                  </span>
                </div>
                {form.description && (
                  <>
                    <Separator />
                    <div className="flex items-start justify-between gap-4 text-sm">
                      <span className="text-muted-foreground flex items-center gap-1.5 flex-shrink-0">
                        <FileText className="w-3.5 h-3.5" /> Note
                      </span>
                      <p className="text-right font-medium">{form.description}</p>
                    </div>
                  </>
                )}
              </div>

              <p className="text-xs text-muted-foreground text-center">
                By clicking "Confirm & Send" you authorise this transfer. This action cannot be undone.
              </p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep('form')}
                >
                  Back
                </Button>
                <Button className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700" onClick={sendPayment}>
                  <Send className="w-4 h-4" />
                  Confirm &amp; Send
                </Button>
              </div>
            </motion.div>
          )}

          {/* ---- STEP 3: Processing ---- */}
          {step === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center py-12 gap-4"
            >
              <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
              <p className="font-semibold">Processing your transfer…</p>
              <p className="text-sm text-muted-foreground text-center">
                Please wait while we securely process your payment.
              </p>
            </motion.div>
          )}

          {/* ---- STEP 4: Result ---- */}
          {step === 'result' && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4"
            >
              {result.success ? (
                <>
                  <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-emerald-600">
                      {formatCurrency(Number(form.amount))} Sent!
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your payment to <strong>{form.recipientName}</strong> was successful.
                    </p>
                  </div>

                  {/* Receipt card */}
                  {result.payment && (
                    <div className="w-full bg-muted/40 rounded-2xl p-4 space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Reference</span>
                        <span className="font-mono text-xs font-medium text-blue-600">
                          {result.payment.reference_id}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date</span>
                        <span className="font-medium">{formatDate(result.payment.payment_date)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <StatusBadge status={result.payment.status} />
                      </div>
                    </div>
                  )}

                  <Button className="w-full" onClick={closeDialog}>
                    Done
                  </Button>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 rounded-full bg-rose-100 dark:bg-rose-950/30 flex items-center justify-center">
                    <XCircle className="w-10 h-10 text-rose-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-rose-600">Payment Failed</p>
                    <p className="text-sm text-muted-foreground mt-1">{result.errorMessage}</p>
                  </div>
                  <div className="flex gap-2 w-full">
                    <Button variant="outline" className="flex-1" onClick={closeDialog}>
                      Close
                    </Button>
                    <Button
                      className="flex-1 gap-2"
                      onClick={() => {
                        setResult(null)
                        setStep('form')
                      }}
                    >
                      <RefreshCw className="w-4 h-4" /> Try Again
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// PaymentRow — single row in the payments list
// ---------------------------------------------------------------------------
function PaymentRow({
  payment,
  currentUserId,
  onClick,
}: {
  payment: Payment
  currentUserId: string
  onClick: () => void
}) {
  const isSender = payment.sender_id === currentUserId
  const counterparty = isSender ? payment.receiver : payment.sender
  const counterpartyName = counterparty?.full_name ?? 'Unknown User'
  const cfg = statusConfig(payment.status)

  return (
    <motion.div
      whileHover={{ x: 3 }}
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer"
    >
      {/* Direction icon */}
      <div
        className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
          isSender
            ? 'bg-rose-100 dark:bg-rose-950/30'
            : 'bg-emerald-100 dark:bg-emerald-950/30',
        )}
      >
        {isSender ? (
          <ArrowUpRight className="w-5 h-5 text-rose-600" />
        ) : (
          <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium truncate">
            {isSender ? `To ${counterpartyName}` : `From ${counterpartyName}`}
          </p>
          <StatusBadge status={payment.status} />
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatDate(payment.payment_date)}
          {payment.description ? ` · ${payment.description}` : ''}
        </p>
      </div>

      {/* Amount */}
      <div className="text-right flex-shrink-0">
        <p
          className={cn(
            'font-semibold text-sm',
            isSender ? 'text-rose-600' : 'text-emerald-600',
          )}
        >
          {isSender ? '-' : '+'}
          {formatCurrency(Number(payment.amount), payment.currency)}
        </p>
        <p className="text-xs text-muted-foreground font-mono">{payment.reference_id.slice(-8)}</p>
      </div>

      <cfg.icon className={cn('w-4 h-4 flex-shrink-0', cfg.iconClass)} />
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// PaymentsPage
// ---------------------------------------------------------------------------
export default function PaymentsPage() {
  const { user } = useAuthStore()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [sendOpen, setSendOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [knownRecipients, setKnownRecipients] = useState<RecipientOption[]>([])

  const loadPayments = useCallback(async () => {
    try {
      const [paymentsRes, recipientsRes] = await Promise.allSettled([
        api.get('/payments'),
        api.get('/users/recipients'),
      ])
      const list: Payment[] = paymentsRes.status === 'fulfilled'
        ? (paymentsRes.value.data?.data ?? paymentsRes.value.data ?? [])
        : []
      setPayments(list)
      // Merge payment-history recipients + all available users
      const historyRecipients = user ? extractRecipients(list, user.id) : []
      const allRecipients: RecipientOption[] = recipientsRes.status === 'fulfilled'
        ? recipientsRes.value.data
        : historyRecipients
      // Deduplicate
      const seen = new Map<string, RecipientOption>()
      ;[...allRecipients, ...historyRecipients].forEach(r => { if (!seen.has(r.id)) seen.set(r.id, r) })
      setKnownRecipients(Array.from(seen.values()))
    } catch (e) {
      console.error(e)
      setPayments([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadPayments()
  }, [loadPayments])

  // Stats derived from payment history
  const sent = payments.filter((p) => p.sender_id === user?.id && p.status === 'completed')
  const received = payments.filter((p) => p.receiver_id === user?.id && p.status === 'completed')
  const totalSent = sent.reduce((acc, p) => acc + Number(p.amount), 0)
  const totalReceived = received.reduce((acc, p) => acc + Number(p.amount), 0)

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* Top bar                                                             */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold">Payments</h2>
          <p className="text-muted-foreground text-sm">Send money and track your payment history</p>
        </div>
        <Button
          onClick={() => setSendOpen(true)}
          size="lg"
          className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-200 dark:shadow-blue-950/30"
        >
          <Send className="w-4 h-4" />
          Send Money
        </Button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Hero / stat cards                                                   */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          <>
            {[
              {
                label: 'Total Sent',
                value: formatCurrency(totalSent),
                icon: ArrowUpRight,
                iconBg: 'bg-rose-100 dark:bg-rose-950/30',
                iconColor: 'text-rose-600',
                count: sent.length,
              },
              {
                label: 'Total Received',
                value: formatCurrency(totalReceived),
                icon: ArrowDownLeft,
                iconBg: 'bg-emerald-100 dark:bg-emerald-950/30',
                iconColor: 'text-emerald-600',
                count: received.length,
              },
              {
                label: 'All Transactions',
                value: String(payments.length),
                icon: DollarSign,
                iconBg: 'bg-blue-100 dark:bg-blue-950/30',
                iconColor: 'text-blue-600',
                count: payments.length,
                noFormat: true,
              },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', stat.iconBg)}>
                      <stat.icon className={cn('w-6 h-6', stat.iconColor)} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                      <p className="text-xl font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.count} payments</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Payment history                                                     */}
      {/* ------------------------------------------------------------------ */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Payment History</CardTitle>
          {!loading && payments.length > 0 && (
            <Badge variant="secondary">{payments.length} total</Badge>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : payments.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center py-16 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Send className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">No payments yet</h3>
              <p className="text-sm text-muted-foreground max-w-xs mb-5">
                Your payment history will appear here once you send or receive money.
              </p>
              <Button onClick={() => setSendOpen(true)} className="gap-2">
                <Send className="w-4 h-4" /> Send Your First Payment
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-1">
              {payments.map((payment) => (
                <PaymentRow
                  key={payment.id}
                  payment={payment}
                  currentUserId={user?.id ?? ''}
                  onClick={() => setSelectedPayment(payment)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Send money dialog                                                   */}
      {/* ------------------------------------------------------------------ */}
      <SendMoneyDialog
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        onSent={loadPayments}
        knownRecipients={knownRecipients}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Payment detail sheet                                                */}
      {/* ------------------------------------------------------------------ */}
      <PaymentDetailSheet
        payment={selectedPayment}
        currentUserId={user?.id ?? ''}
        onClose={() => setSelectedPayment(null)}
      />
    </div>
  )
}

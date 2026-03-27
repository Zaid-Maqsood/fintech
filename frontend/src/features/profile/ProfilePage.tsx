import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import {
  User,
  Lock,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  Eye,
  EyeOff,
  Save,
  AlertCircle,
  CheckCircle2,
  Clock,
  Globe,
  Phone,
  CreditCard,
  FileText,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/store/authStore'
import { formatDate, cn, getInitials } from '@/lib/utils'
import api from '@/lib/api'
import type { User as UserType } from '@/types'

// ---------------------------------------------------------------------------
// Inline toast
// ---------------------------------------------------------------------------
function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8 }}
      className={cn(
        'flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm font-medium border',
        type === 'success'
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800'
          : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800',
      )}
    >
      {type === 'success'
        ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
        : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
      {message}
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// ProfileTab
// ---------------------------------------------------------------------------
function ProfileTab({ user, onUpdated }: { user: UserType; onUpdated: (u: UserType) => void }) {
  const { setUser } = useAuthStore()
  const [form, setForm] = useState({
    full_name: user.full_name ?? '',
    phone: user.phone ?? '',
    country: user.country ?? '',
    currency_preference: user.currency_preference ?? '',
    timezone: user.timezone ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await api.put('/users/me', form)
      const updated = res.data.user ?? res.data
      setUser(updated)
      onUpdated(updated)
      showToast('Profile updated successfully', 'success')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to update profile'
      showToast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const kycStatusConfig = {
    verified: { icon: <ShieldCheck className="h-5 w-5 text-emerald-500" />, label: 'Verified', className: 'text-emerald-600' },
    pending: { icon: <Clock className="h-5 w-5 text-yellow-500" />, label: 'Pending Review', className: 'text-yellow-600' },
    rejected: { icon: <ShieldAlert className="h-5 w-5 text-rose-500" />, label: 'Rejected', className: 'text-rose-600' },
    not_submitted: { icon: <ShieldOff className="h-5 w-5 text-gray-400" />, label: 'Not Submitted', className: 'text-gray-500' },
  }
  const kycCfg = kycStatusConfig[user.kyc_status]

  return (
    <div className="space-y-6">
      {/* Avatar + Identity */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-500 via-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg"
            >
              <span className="text-white text-2xl font-bold">{getInitials(user.full_name)}</span>
            </motion.div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-xl font-bold text-foreground">{user.full_name}</h3>
              <p className="text-muted-foreground text-sm mt-0.5">{user.email}</p>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-3 flex-wrap">
                <span className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold',
                  user.account_status === 'active'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                    : user.account_status === 'suspended'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
                )}>
                  <span className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    user.account_status === 'active' ? 'bg-emerald-500' : 'bg-gray-400',
                  )} />
                  {user.account_status.charAt(0).toUpperCase() + user.account_status.slice(1)}
                </span>
                <span className={cn('inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-muted', kycCfg.className)}>
                  {kycCfg.icon}
                  KYC {kycCfg.label}
                </span>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" disabled>
              Verify Identity
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit Form */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {toast && <Toast message={toast.message} type={toast.type} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="full_name" className="text-sm font-medium">Full Name</Label>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="Your full name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                Phone
              </Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+1 (555) 000-0000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="country" className="text-sm font-medium flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                Country
              </Label>
              <Input
                id="country"
                value={form.country}
                onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                placeholder="US"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currency" className="text-sm font-medium flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                Currency Preference
              </Label>
              <Input
                id="currency"
                value={form.currency_preference}
                onChange={e => setForm(f => ({ ...f, currency_preference: e.target.value }))}
                placeholder="USD"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="timezone" className="text-sm font-medium flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                Timezone
              </Label>
              <Input
                id="timezone"
                value={form.timezone}
                onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}
                placeholder="America/New_York"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SecurityTab
// ---------------------------------------------------------------------------
function SecurityTab({ user }: { user: UserType }) {
  const [form, setForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const handleSubmit = async () => {
    if (!form.current_password || !form.new_password || !form.confirm_password) {
      showToast('Please fill in all fields', 'error')
      return
    }
    if (form.new_password !== form.confirm_password) {
      showToast('New passwords do not match', 'error')
      return
    }
    if (form.new_password.length < 8) {
      showToast('Password must be at least 8 characters', 'error')
      return
    }
    setSaving(true)
    try {
      await api.put('/users/me/password', {
        current_password: form.current_password,
        new_password: form.new_password,
      })
      setForm({ current_password: '', new_password: '', confirm_password: '' })
      showToast('Password updated successfully', 'success')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to update password'
      showToast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const passwordFields = [
    {
      id: 'current_password',
      label: 'Current Password',
      value: form.current_password,
      key: 'current' as const,
      onChange: (v: string) => setForm(f => ({ ...f, current_password: v })),
    },
    {
      id: 'new_password',
      label: 'New Password',
      value: form.new_password,
      key: 'new' as const,
      onChange: (v: string) => setForm(f => ({ ...f, new_password: v })),
    },
    {
      id: 'confirm_password',
      label: 'Confirm New Password',
      value: form.confirm_password,
      key: 'confirm' as const,
      onChange: (v: string) => setForm(f => ({ ...f, confirm_password: v })),
    },
  ]

  const securityTips = [
    'Use at least 12 characters with a mix of letters, numbers, and symbols',
    'Never reuse passwords across different services',
    'Enable two-factor authentication when available',
    'Never share your password or security codes with anyone',
    'Use a password manager to generate and store strong passwords',
  ]

  return (
    <div className="space-y-6">
      {/* Change Password */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {toast && <Toast message={toast.message} type={toast.type} />}

          {passwordFields.map(field => (
            <div key={field.id} className="space-y-1.5">
              <Label htmlFor={field.id} className="text-sm font-medium">{field.label}</Label>
              <div className="relative">
                <Input
                  id={field.id}
                  type={showPasswords[field.key] ? 'text' : 'password'}
                  value={field.value}
                  onChange={e => field.onChange(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(s => ({ ...s, [field.key]: !s[field.key] }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPasswords[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ))}

          {/* Strength indicator */}
          {form.new_password && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Password strength</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map(level => {
                  const strength = Math.min(
                    4,
                    (form.new_password.length >= 8 ? 1 : 0) +
                    (/[A-Z]/.test(form.new_password) ? 1 : 0) +
                    (/[0-9]/.test(form.new_password) ? 1 : 0) +
                    (/[^A-Za-z0-9]/.test(form.new_password) ? 1 : 0),
                  )
                  return (
                    <div
                      key={level}
                      className={cn(
                        'h-1.5 flex-1 rounded-full transition-colors',
                        level <= strength
                          ? strength <= 1 ? 'bg-rose-500' : strength <= 2 ? 'bg-amber-500' : strength <= 3 ? 'bg-yellow-500' : 'bg-emerald-500'
                          : 'bg-muted',
                      )}
                    />
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button onClick={handleSubmit} disabled={saving} className="gap-2">
              <Lock className="h-4 w-4" />
              {saving ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: 'Account Created', value: formatDate(user.created_at) },
            { label: 'Email Address', value: user.email },
            { label: 'Role', value: user.role.charAt(0).toUpperCase() + user.role.slice(1) },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className="text-sm font-medium text-foreground">{value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Security Tips */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            Security Best Practices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2.5">
            {securityTips.map((tip, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-start gap-2.5 text-sm text-muted-foreground"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                {tip}
              </motion.li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ComplianceTab
// ---------------------------------------------------------------------------
function ComplianceTab({ user }: { user: UserType }) {
  const kycConfig: Record<UserType['kyc_status'], { icon: React.ReactNode; label: string; desc: string; color: string; bg: string }> = {
    verified: {
      icon: <ShieldCheck className="h-8 w-8 text-emerald-500" />,
      label: 'Identity Verified',
      desc: 'Your identity has been successfully verified.',
      color: 'text-emerald-700 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800',
    },
    pending: {
      icon: <Clock className="h-8 w-8 text-yellow-500" />,
      label: 'Verification Pending',
      desc: 'Your documents are under review. This may take 1–3 business days.',
      color: 'text-yellow-700 dark:text-yellow-400',
      bg: 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800',
    },
    rejected: {
      icon: <ShieldAlert className="h-8 w-8 text-rose-500" />,
      label: 'Verification Rejected',
      desc: 'Your documents were rejected. Please resubmit with clearer images.',
      color: 'text-rose-700 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800',
    },
    not_submitted: {
      icon: <ShieldOff className="h-8 w-8 text-gray-400" />,
      label: 'Not Submitted',
      desc: 'You have not submitted identity documents yet.',
      color: 'text-gray-600 dark:text-gray-400',
      bg: 'bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700',
    },
  }
  const kycCfg = kycConfig[user.kyc_status]

  const amlConfig: Record<UserType['aml_status'], { label: string; className: string }> = {
    clear: { label: 'Clear', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' },
    flagged: { label: 'Flagged', className: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400' },
    under_review: { label: 'Under Review', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' },
  }
  const amlCfg = amlConfig[user.aml_status]

  const riskConfig: Record<UserType['risk_level'], { label: string; className: string }> = {
    low: { label: 'Low', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' },
    medium: { label: 'Medium', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' },
    high: { label: 'High', className: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400' },
  }
  const riskCfg = riskConfig[user.risk_level]

  return (
    <div className="space-y-6">
      {/* KYC Status */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            KYC Verification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn('flex items-start gap-4 p-4 rounded-xl border', kycCfg.bg)}
          >
            <div className="flex-shrink-0 mt-0.5">{kycCfg.icon}</div>
            <div className="flex-1">
              <p className={cn('font-semibold', kycCfg.color)}>{kycCfg.label}</p>
              <p className="text-sm text-muted-foreground mt-1">{kycCfg.desc}</p>
            </div>
          </motion.div>
        </CardContent>
      </Card>

      {/* AML + Risk */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Compliance Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          {[
            {
              label: 'AML Status',
              value: <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', amlCfg.className)}>{amlCfg.label}</span>,
            },
            {
              label: 'Risk Level',
              value: <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', riskCfg.className)}>{riskCfg.label}</span>,
            },
            {
              label: 'Account Status',
              value: (
                <span className={cn(
                  'text-xs font-semibold px-2.5 py-1 rounded-full',
                  user.account_status === 'active'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
                )}>
                  {user.account_status.charAt(0).toUpperCase() + user.account_status.slice(1)}
                </span>
              ),
            },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-3 border-b border-border/40 last:border-0">
              <span className="text-sm text-muted-foreground">{label}</span>
              {value}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Document Submission */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Document Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Submit government-issued identification documents to complete your identity verification. Accepted documents include passports, national ID cards, and driver's licenses.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {['Government ID', 'Proof of Address', 'Selfie Verification'].map(doc => (
              <div key={doc} className="flex items-center gap-2.5 p-3 rounded-lg bg-muted/50 border border-border/50">
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">{doc}</p>
                  <p className="text-xs text-muted-foreground">Required</p>
                </div>
              </div>
            ))}
          </div>
          <Button disabled variant="outline" className="gap-2 w-full sm:w-auto">
            <FileText className="h-4 w-4" />
            Submit Documents (Coming Soon)
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ProfilePage
// ---------------------------------------------------------------------------
export default function ProfilePage() {
  const { user: authUser, setUser } = useAuthStore()
  const [user, setLocalUser] = useState<UserType | null>(authUser)
  const [loading, setLoading] = useState(!authUser)

  useEffect(() => {
    if (authUser) {
      setLocalUser(authUser)
      return
    }
    const fetch = async () => {
      try {
        const res = await api.get('/users/me')
        const u = res.data.user ?? res.data
        setLocalUser(u)
        setUser(u)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [authUser, setUser])

  const handleUpdated = (updated: UserType) => {
    setLocalUser(updated)
    setUser(updated)
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Profile & Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage your account, security, and compliance information</p>
      </motion.div>

      {loading || !user ? (
        <div className="space-y-4">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Tabs defaultValue="profile">
            <TabsList className="grid grid-cols-3 w-full sm:w-auto sm:inline-grid mb-6">
              <TabsTrigger value="profile" className="gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-2">
                <Lock className="h-4 w-4" />
                <span className="hidden sm:inline">Security</span>
              </TabsTrigger>
              <TabsTrigger value="compliance" className="gap-2">
                <ShieldCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Compliance</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-0">
              <ProfileTab user={user} onUpdated={handleUpdated} />
            </TabsContent>
            <TabsContent value="security" className="mt-0">
              <SecurityTab user={user} />
            </TabsContent>
            <TabsContent value="compliance" className="mt-0">
              <ComplianceTab user={user} />
            </TabsContent>
          </Tabs>
        </motion.div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'motion/react'
import { Shield, ArrowRight, Loader2, Mail, ArrowLeft, Copy, CheckCheck, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import api from '@/lib/api'

const schema = z.object({
  email: z.string().email('Invalid email address'),
})
type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [resetToken, setResetToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const res = await api.post('/auth/forgot-password', { email: data.email })
      // In demo mode the API returns the reset token directly
      const token: string = res.data.resetToken ?? res.data.token ?? res.data.reset_token ?? ''
      setResetToken(token)
      toast({
        title: 'Reset link sent',
        description: 'Check your email for the password reset instructions.',
      })
    } catch (err: any) {
      toast({
        title: 'Request failed',
        description: err.response?.data?.error || 'Could not send reset link. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!resetToken) return
    try {
      await navigator.clipboard.writeText(resetToken)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({ title: 'Token copied', description: 'Reset token copied to clipboard.' })
    } catch {
      toast({ title: 'Copy failed', description: 'Could not copy to clipboard.', variant: 'destructive' })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4 shadow-lg shadow-blue-600/30">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">PocketPro</h1>
          <p className="text-blue-300 mt-1">Secure Financial Platform</p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl"
        >
          <AnimatePresence mode="wait">
            {!resetToken ? (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {/* Icon */}
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 mb-4">
                  <Mail className="w-6 h-6 text-blue-400" />
                </div>

                <h2 className="text-2xl font-semibold text-white mb-2">Forgot password?</h2>
                <p className="text-blue-200 mb-6 text-sm">
                  No worries. Enter your email and we'll send you a reset link.
                </p>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <Label className="text-blue-100 text-sm mb-1.5 block">Email address</Label>
                    <Input
                      {...register('email')}
                      type="email"
                      placeholder="you@example.com"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-blue-400 focus:ring-blue-400/20"
                    />
                    {errors.email && (
                      <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold h-11 rounded-lg shadow-lg shadow-blue-600/30"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    {loading ? 'Sending...' : 'Send reset link'}
                    {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
                  </Button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {/* Success icon */}
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-green-600/20 border border-green-500/30 mb-4">
                  <KeyRound className="w-6 h-6 text-green-400" />
                </div>

                <h2 className="text-2xl font-semibold text-white mb-2">Check your email</h2>
                <p className="text-blue-200 mb-2 text-sm">
                  We sent a password reset link to{' '}
                  <span className="text-white font-medium">{getValues('email')}</span>.
                </p>
                <p className="text-blue-300 mb-6 text-xs">
                  Didn't receive the email? Check your spam folder or use the demo token below.
                </p>

                {/* Demo token display */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 mb-4">
                  <p className="text-xs text-blue-300 font-medium mb-2">
                    Demo mode — reset token
                  </p>
                  <p className="text-xs text-white/50 mb-3">
                    In production this would only be sent by email. For testing, copy this token and
                    use it on the reset password page.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs text-green-300 bg-black/20 rounded-lg px-3 py-2 font-mono break-all">
                      {resetToken}
                    </code>
                    <button
                      onClick={handleCopy}
                      className="flex-shrink-0 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
                      title="Copy token"
                    >
                      {copied ? (
                        <CheckCheck className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Link to="/reset-password">
                  <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold h-11 rounded-lg shadow-lg shadow-blue-600/30 mb-3">
                    Go to reset password
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-4 pt-4 border-t border-white/10 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm text-blue-300 hover:text-blue-200 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to sign in
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'motion/react'
import { Shield, ArrowRight, Loader2, Eye, EyeOff, ArrowLeft, LockKeyhole, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import api from '@/lib/api'

const schema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

type FormData = z.infer<typeof schema>

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const tokenFromUrl = searchParams.get('token') ?? ''

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { token: tokenFromUrl },
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      await api.post('/auth/reset-password', {
        token: data.token,
        newPassword: data.password,
      })
      setSuccess(true)
      toast({
        title: 'Password reset successful',
        description: 'Your password has been updated. You can now sign in.',
      })
      setTimeout(() => navigate('/login'), 2500)
    } catch (err: any) {
      toast({
        title: 'Reset failed',
        description:
          err.response?.data?.error ||
          'Could not reset password. The token may be expired or invalid.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
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
          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-600/20 border border-green-500/30 mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-2xl font-semibold text-white mb-2">Password updated!</h2>
              <p className="text-blue-200 text-sm mb-6">
                Your password has been reset successfully. Redirecting you to sign in...
              </p>
              <div className="flex items-center justify-center gap-2 text-blue-300 text-xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Redirecting to login...
              </div>
            </motion.div>
          ) : (
            <>
              {/* Icon */}
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 mb-4">
                <LockKeyhole className="w-6 h-6 text-blue-400" />
              </div>

              <h2 className="text-2xl font-semibold text-white mb-2">Reset password</h2>
              <p className="text-blue-200 mb-6 text-sm">
                Enter your reset token and choose a new secure password.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Token */}
                <div>
                  <Label className="text-blue-100 text-sm mb-1.5 block">Reset token</Label>
                  <Input
                    {...register('token')}
                    type="text"
                    placeholder="Paste your reset token here"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-blue-400 focus:ring-blue-400/20 font-mono text-sm"
                  />
                  {errors.token && (
                    <p className="text-red-400 text-xs mt-1">{errors.token.message}</p>
                  )}
                  {tokenFromUrl && (
                    <p className="text-green-400/80 text-xs mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Token pre-filled from link
                    </p>
                  )}
                </div>

                {/* New Password */}
                <div>
                  <Label className="text-blue-100 text-sm mb-1.5 block">New password</Label>
                  <div className="relative">
                    <Input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-blue-400 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <Label className="text-blue-100 text-sm mb-1.5 block">Confirm new password</Label>
                  <div className="relative">
                    <Input
                      {...register('confirm_password')}
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-blue-400 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {errors.confirm_password && (
                    <p className="text-red-400 text-xs mt-1">{errors.confirm_password.message}</p>
                  )}
                </div>

                {/* Password requirements hint */}
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-xs text-blue-300 font-medium mb-1.5">Password requirements</p>
                  <ul className="space-y-0.5 text-xs text-white/50">
                    <li>• At least 8 characters</li>
                    <li>• One uppercase letter (A–Z)</li>
                    <li>• One number (0–9)</li>
                    <li>• One special character (!@#$...)</li>
                  </ul>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold h-11 rounded-lg shadow-lg shadow-blue-600/30"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {loading ? 'Resetting password...' : 'Reset password'}
                  {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              </form>
            </>
          )}

          {!success && (
            <div className="mt-4 pt-4 border-t border-white/10 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-sm text-blue-300 hover:text-blue-200 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to sign in
              </Link>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

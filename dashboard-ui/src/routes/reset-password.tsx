import { useState } from "react"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { z } from "zod"
import { authClient } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Lock, CheckCircle2, ArrowLeft } from "lucide-react"

const searchSchema = z.object({ token: z.string().optional() })

export const Route = createFileRoute("/reset-password")({
  validateSearch: searchSchema,
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { token }                   = Route.useSearch()
  const navigate                    = useNavigate()
  const [password, setPassword]     = useState("")
  const [confirm, setConfirm]       = useState("")
  const [isLoading, setLoading]     = useState(false)
  const [done, setDone]             = useState(false)
  const [error, setError]           = useState("")

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm border-2 border-foreground shadow-[4px_4px_0px_0px_oklch(0.1_0_0)]">
          <div className="bg-destructive text-white px-7 py-6">
            <h1 className="text-xl font-black">Invalid link</h1>
          </div>
          <div className="px-7 py-8 space-y-4">
            <p className="text-sm text-muted-foreground">
              This reset link is invalid or has expired. Please request a new one.
            </p>
            <Link to="/forgot-password">
              <Button variant="outline" className="w-full">Request new link</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError("Passwords do not match"); return }
    if (password.length < 8)  { setError("Password must be at least 8 characters"); return }
    setLoading(true)
    setError("")
    try {
      await authClient.resetPassword({ newPassword: password, token })
      setDone(true)
      setTimeout(() => navigate({ to: "/login" }), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password. The link may have expired.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-6">

        {!done && (
          <Link to="/login" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
        )}

        <div className="border-2 border-foreground shadow-[4px_4px_0px_0px_oklch(0.1_0_0)]">
          <div className="bg-foreground text-background px-7 py-6">
            <p className="text-[10px] uppercase tracking-[0.25em] text-background/40 mb-2">Account</p>
            <h1 className="text-2xl font-black">{done ? "Password updated" : "Set new password"}</h1>
          </div>

          {done ? (
            <div className="px-7 py-8 flex flex-col items-center gap-4 text-center">
              <CheckCircle2 className="h-10 w-10 text-foreground" />
              <p className="text-sm text-muted-foreground">
                Your password has been updated. Redirecting to login…
              </p>
            </div>
          ) : (
            <div className="px-7 py-8">
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="password">New password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="password" type="password" value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 8 characters" className="pl-10 h-12" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirm password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="confirm" type="password" value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Re-enter your password" className="pl-10 h-12" required />
                  </div>
                </div>
                <Button type="submit" className="w-full h-12" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Update password
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

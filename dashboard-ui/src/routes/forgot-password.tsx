import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { authClient } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react"

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const [email, setEmail]       = useState("")
  const [isLoading, setLoading] = useState(false)
  const [sent, setSent]         = useState(false)
  const [error, setError]       = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      await authClient.forgetPassword({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      })
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-6">

        <Link to="/login" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>

        {sent ? (
          <div className="border-2 border-foreground shadow-[4px_4px_0px_0px_oklch(0.1_0_0)]">
            <div className="bg-foreground text-background px-7 py-6">
              <p className="text-[10px] uppercase tracking-[0.25em] text-background/40 mb-2">Email sent</p>
              <h1 className="text-2xl font-black">Check your inbox</h1>
            </div>
            <div className="px-7 py-8 flex flex-col items-center gap-4 text-center">
              <CheckCircle2 className="h-10 w-10 text-foreground" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                We've sent a password reset link to <strong>{email}</strong>.
                The link expires in 1 hour.
              </p>
              <p className="text-xs text-muted-foreground">
                Didn't receive it? Check your spam folder or{" "}
                <button className="underline" onClick={() => setSent(false)}>try again</button>.
              </p>
            </div>
          </div>
        ) : (
          <div className="border-2 border-foreground shadow-[4px_4px_0px_0px_oklch(0.1_0_0)]">
            <div className="bg-foreground text-background px-7 py-6">
              <p className="text-[10px] uppercase tracking-[0.25em] text-background/40 mb-2">Account</p>
              <h1 className="text-2xl font-black">Reset password</h1>
            </div>
            <div className="px-7 py-8">
              <p className="text-sm text-muted-foreground mb-6">
                Enter your email and we'll send you a reset link.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="pl-10 h-12"
                      required
                      autoFocus
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full h-12" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Send reset link
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

import { useState } from "react"
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient, signIn } from "@/lib/auth"
import { Loader2, Mail, Lock } from "lucide-react"
import { z } from "zod"

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute("/login")({
  validateSearch: loginSearchSchema,
  beforeLoad: async ({ search }) => {
    if (typeof window === "undefined") return

    try {
      const { data: session } = await authClient.getSession()
      if (session) {
        throw redirect({ to: search.redirect || "/dashboard" })
      }
    } catch (e) {
      if (e && typeof e === "object" && "to" in e) throw e
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const { redirect: redirectTo } = Route.useSearch()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    try {
      const { error: signInError } = await signIn.email({ email, password })
      if (signInError) throw new Error(signInError.message)
      navigate({ to: redirectTo || "/dashboard" })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid email or password")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <div className="flex w-full">

        {/* ── Left panel ── */}
        <div
          className="relative hidden md:flex w-[58%] shrink-0 flex-col justify-between p-14 text-white overflow-hidden"
          style={{ background: "linear-gradient(145deg, #030b06 0%, #0a1f10 30%, #142d26 60%, #1b4a32 85%, #236040 100%)" }}
        >

          {/* Subtle grid */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.03]" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="white" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* Corner brackets */}
          <svg className="absolute top-6 left-6 opacity-20" width="36" height="36" viewBox="0 0 36 36" fill="none">
            <path d="M0 18 L0 0 L18 0" stroke="white" strokeWidth="1.2" />
          </svg>
          <svg className="absolute bottom-6 right-6 opacity-20" width="36" height="36" viewBox="0 0 36 36" fill="none">
            <path d="M36 18 L36 36 L18 36" stroke="white" strokeWidth="1.2" />
          </svg>

          {/* ── Supply chain cycle — large, centered ── */}
          <svg
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.14]"
            width="400" height="400" viewBox="0 0 400 400" fill="none"
          >
            <defs>
              <marker id="arr" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto">
                <path d="M0,0 L8,4 L0,8 Z" fill="white" />
              </marker>
            </defs>

            {/* Dashed orbit */}
            <circle cx="200" cy="200" r="135" stroke="white" strokeWidth="0.6" strokeDasharray="3 8" />

            {/* Arc: Waste Generator → Aggregator */}
            <path d="M 210,70 C 272,100 300,168 292,252" stroke="white" strokeWidth="1.2" markerEnd="url(#arr)" />
            {/* Arc: Aggregator → Waste Picker */}
            <path d="M 278,268 C 252,318 148,318 112,268" stroke="white" strokeWidth="1.2" markerEnd="url(#arr)" />
            {/* Arc: Waste Picker → Waste Generator */}
            <path d="M 102,252 C 94,168 122,100 188,70" stroke="white" strokeWidth="1.2" markerEnd="url(#arr)" />

            {/* Node: Waste Generator (top) */}
            <circle cx="200" cy="62" r="20" stroke="white" strokeWidth="1.2" />
            <circle cx="200" cy="62" r="5" fill="white" opacity="0.5" />
            <text x="200" y="30" textAnchor="middle" fill="white" fontSize="9" fontFamily="sans-serif" letterSpacing="1.5" opacity="0.8">WASTE GENERATOR</text>

            {/* Node: Aggregator (bottom-right) */}
            <circle cx="296" cy="268" r="20" stroke="white" strokeWidth="1.2" />
            <circle cx="296" cy="268" r="5" fill="white" opacity="0.5" />
            <text x="330" y="268" textAnchor="start" fill="white" fontSize="9" fontFamily="sans-serif" letterSpacing="1.5" opacity="0.8" dominantBaseline="middle">AGGREGATOR</text>

            {/* Node: Waste Picker (bottom-left) */}
            <circle cx="104" cy="268" r="20" stroke="white" strokeWidth="1.2" />
            <circle cx="104" cy="268" r="5" fill="white" opacity="0.5" />
            <text x="70" y="268" textAnchor="end" fill="white" fontSize="9" fontFamily="sans-serif" letterSpacing="1.5" opacity="0.8" dominantBaseline="middle">WASTE PICKER</text>
          </svg>

          {/* ── Paper Bag — top right ── */}
          <svg className="absolute top-24 right-14 opacity-[0.18]" width="80" height="105" viewBox="0 0 80 105" fill="none">
            {/* Handles */}
            <path d="M22,34 C22,13 58,13 58,34" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            {/* Body */}
            <path d="M13,34 L67,34 L71,96 L9,96 Z" stroke="white" strokeWidth="1.5" />
            {/* Fold crease */}
            <line x1="13" y1="47" x2="67" y2="47" stroke="white" strokeWidth="0.8" strokeDasharray="3 4" />
            {/* Brand line */}
            <line x1="22" y1="62" x2="58" y2="62" stroke="white" strokeWidth="0.8" opacity="0.4" />
          </svg>

          {/* ── Corrugated Box — bottom left ── */}
          <svg className="absolute bottom-40 left-10 opacity-[0.15]" width="115" height="95" viewBox="0 0 115 95" fill="none">
            {/* Front face */}
            <rect x="5" y="34" width="60" height="54" stroke="white" strokeWidth="1.5" />
            {/* Top face */}
            <path d="M5,34 L25,14 L85,14 L65,34 Z" stroke="white" strokeWidth="1.5" />
            {/* Right face */}
            <path d="M65,34 L85,14 L85,68 L65,88" stroke="white" strokeWidth="1.5" />
            {/* Corrugation lines on front */}
            <line x1="5" y1="50" x2="65" y2="50" stroke="white" strokeWidth="0.7" opacity="0.45" />
            <line x1="5" y1="63" x2="65" y2="63" stroke="white" strokeWidth="0.7" opacity="0.45" />
            <line x1="5" y1="75" x2="65" y2="75" stroke="white" strokeWidth="0.7" opacity="0.45" />
            {/* Corrugation on right face */}
            <line x1="65" y1="50" x2="85" y2="38" stroke="white" strokeWidth="0.5" opacity="0.3" />
            <line x1="65" y1="63" x2="85" y2="51" stroke="white" strokeWidth="0.5" opacity="0.3" />
          </svg>

          {/* ── Eco Pouch — right middle ── */}
          <svg className="absolute top-1/2 -translate-y-1/2 right-8 opacity-[0.16]" width="74" height="106" viewBox="0 0 74 106" fill="none">
            {/* Body */}
            <path d="M9,20 L65,20 L68,76 Q37,92 6,76 Z" stroke="white" strokeWidth="1.5" />
            {/* Top seal bar */}
            <line x1="9" y1="30" x2="65" y2="30" stroke="white" strokeWidth="1.2" />
            {/* Hang hole */}
            <circle cx="37" cy="10" r="5" stroke="white" strokeWidth="1.2" />
            {/* Eco leaf */}
            <path d="M37,52 C37,42 52,45 52,45 C52,45 48,60 37,60 C26,60 21,50 21,50 C21,50 37,62 37,52" stroke="white" strokeWidth="1" fill="none" opacity="0.55" />
            {/* Leaf vein */}
            <line x1="37" y1="52" x2="37" y2="60" stroke="white" strokeWidth="0.6" opacity="0.4" />
          </svg>

          {/* ── Paper Box (carton) — mid-left, faint ── */}
          <svg className="absolute top-[38%] left-14 opacity-[0.10]" width="88" height="75" viewBox="0 0 88 75" fill="none">
            {/* Front */}
            <rect x="5" y="24" width="54" height="46" stroke="white" strokeWidth="1.5" />
            {/* Left top flap */}
            <path d="M5,24 L5,9 L32,9 L32,24" stroke="white" strokeWidth="1.5" />
            {/* Right top flap */}
            <path d="M59,24 L59,9 L32,9" stroke="white" strokeWidth="1.5" strokeDasharray="3 3" />
            {/* Right face */}
            <path d="M59,24 L76,14 L76,60 L59,70" stroke="white" strokeWidth="1.5" />
            {/* Window die-cut */}
            <rect x="14" y="32" width="30" height="22" rx="2" stroke="white" strokeWidth="0.8" strokeDasharray="2 3" opacity="0.45" />
          </svg>

          {/* ── Logo ── */}
          <div className="relative z-10 flex items-center gap-4">
            <img
              src="https://res.cloudinary.com/ddwet1dzj/image/upload/v1777042366/dercolbags/DERCOLBAGS_LOGO_tolkgw.png"
              alt="DercolBags"
              className="h-20 w-auto object-contain drop-shadow-xl"
            />
            <div>
              <p className="text-2xl font-bold tracking-wide leading-none">DercolBags</p>
              <p className="text-sm font-medium tracking-[0.3em] text-white/45 uppercase mt-1">Pulse</p>
            </div>
          </div>

          {/* ── Bottom content ── */}
          <div className="relative z-10">
            <p className="text-[10px] font-bold tracking-[0.35em] uppercase text-white/30 mb-3">
              Premium Fibre-Based Solutions
            </p>
            <h2 className="text-5xl font-bold leading-tight tracking-tight">
              Command<br />Centre
            </h2>
            <p className="mt-3 text-xs text-white/30 leading-relaxed max-w-xs tracking-wide">
              Internal platform for managing DercolBags newsletters, campaigns and subscriber lists.
            </p>

            {/* Products */}
            <div className="mt-5 grid grid-cols-3 gap-x-5 gap-y-2">
              {[
                "Paper Bags",
                "Corrugated Boxes",
                "Paper Boxes",
                "Eco Pouches",
                "Custom Packaging",
                "Generic Packaging",
              ].map((p) => (
                <div key={p} className="flex items-center gap-1.5">
                  <div className="h-px w-3 bg-white/20 shrink-0" />
                  <p className="text-[10px] font-medium text-white/40 tracking-wide leading-tight">{p}</p>
                </div>
              ))}
            </div>

            {/* Supply chain roles */}
            <div className="mt-5 flex items-center gap-2">
              {["Waste Pickers", "Waste Generator", "Aggregator"].map((role, i, arr) => (
                <div key={role} className="flex items-center gap-2">
                  <p className="text-[9px] font-semibold tracking-[0.18em] uppercase text-white/25">{role}</p>
                  {i < arr.length - 1 && (
                    <svg width="14" height="8" viewBox="0 0 14 8" fill="none" className="opacity-20 shrink-0">
                      <path d="M0,4 L11,4 M8,1 L11,4 L8,7" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right panel — form ── */}
        <div className="flex flex-1 flex-col justify-center bg-card px-10">
          <div className="mx-auto w-full max-w-sm space-y-6 [&_input]:h-12 [&_input]:text-base">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Sign In</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter your credentials to access DercolBags Pulse
              </p>
            </div>

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
                    className="pl-10"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </div>
        </div>

      </div>
    </div>
  )
}

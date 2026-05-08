import { useEffect, useRef, useState, useCallback } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useSession, signOut, authClient } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Clock, LogOut, ShieldAlert } from "lucide-react"

const IDLE_MS  = 50 * 60 * 1000  // 50 min idle → show warning
const GRACE_MS = 10 * 60 * 1000  // 10 min grace → then auto-logout
const GRACE_S  = GRACE_MS / 1000

const ACTIVITY_EVENTS = [
  "mousemove", "mousedown", "keydown",
  "scroll", "touchstart", "click",
] as const

function fmt(secs: number) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export function InactivityWatcher() {
  const { data: session } = useSession()
  const navigate = useNavigate()

  const [showWarning, setShowWarning] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(GRACE_S)

  const idleTimer    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const warningRef   = useRef(false)  // tracks warning state without closure staleness

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
  }, [])

  const startCountdown = useCallback(() => {
    setSecondsLeft(GRACE_S)
    clearCountdown()
    countdownRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!)
          countdownRef.current = null
          // Auto-logout
          signOut().then(() => {
            navigate({ to: "/login", search: { reason: "timeout" } as any })
          })
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [clearCountdown, navigate])

  const resetIdleTimer = useCallback(() => {
    if (warningRef.current) return  // don't reset while warning is showing
    if (idleTimer.current) clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => {
      warningRef.current = true
      setShowWarning(true)
      startCountdown()
    }, IDLE_MS)
  }, [startCountdown])

  const handleStayLoggedIn = useCallback(async () => {
    clearCountdown()
    warningRef.current = false
    setShowWarning(false)
    setSecondsLeft(GRACE_S)
    // Ping the backend — Better Auth will refresh the session age
    await authClient.getSession()
    resetIdleTimer()
  }, [clearCountdown, resetIdleTimer])

  const handleLogoutNow = useCallback(async () => {
    clearCountdown()
    setShowWarning(false)
    await signOut()
    navigate({ to: "/login", search: {} })
  }, [clearCountdown, navigate])

  // Set up activity listeners
  useEffect(() => {
    if (!session) return  // only watch when authenticated

    ACTIVITY_EVENTS.forEach((e) =>
      window.addEventListener(e, resetIdleTimer, { passive: true })
    )
    resetIdleTimer()  // start the first timer

    return () => {
      ACTIVITY_EVENTS.forEach((e) =>
        window.removeEventListener(e, resetIdleTimer)
      )
      if (idleTimer.current)    clearTimeout(idleTimer.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [session, resetIdleTimer])

  if (!session || !showWarning) return null

  const urgency = secondsLeft <= 60  // last minute — turn red

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md border-2 border-foreground shadow-[6px_6px_0px_0px_oklch(0.1_0_0)] bg-card">

          {/* Header */}
          <div className={`px-7 py-6 border-b-2 border-foreground flex items-center gap-4 ${urgency ? "bg-destructive" : "bg-foreground"}`}>
            <ShieldAlert className="h-6 w-6 text-background shrink-0" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-background/50 mb-0.5">Security</p>
              <h2 className="text-lg font-black text-background leading-tight">
                Your session is about to expire
              </h2>
            </div>
          </div>

          {/* Body */}
          <div className="px-7 py-8 space-y-6">

            {/* Countdown */}
            <div className="text-center">
              <div className={`inline-flex items-center gap-3 border-2 px-6 py-4 ${urgency ? "border-destructive" : "border-foreground"}`}>
                <Clock className={`h-5 w-5 ${urgency ? "text-destructive animate-pulse" : "text-muted-foreground"}`} />
                <span className={`text-4xl font-black tabular-nums tracking-tight ${urgency ? "text-destructive" : ""}`}>
                  {fmt(secondsLeft)}
                </span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                You've been inactive for 50 minutes. We'll log you out automatically
                to keep your account secure.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                className="flex-1 shadow-md hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                onClick={handleStayLoggedIn}
              >
                Stay logged in
              </Button>
              <Button
                variant="outline"
                className="shrink-0 shadow-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                onClick={handleLogoutNow}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </Button>
            </div>

            <p className="text-center text-[11px] text-muted-foreground">
              Clicking <strong>Stay logged in</strong> resets your session for another 8 hours.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

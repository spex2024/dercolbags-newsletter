import { useEffect, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
import { api } from "@/lib/api"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"

const searchSchema = z.object({ token: z.string().optional() })

export const Route = createFileRoute("/unsubscribe")({
  validateSearch: searchSchema,
  component: UnsubscribePage,
})

function UnsubscribePage() {
  const { token } = Route.useSearch()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setMessage("Invalid unsubscribe link — no token found.")
      return
    }

    api
      .get(`/api/v1/subscribers/unsubscribe?token=${token}`)
      .then(() => {
        setStatus("success")
        setMessage("You have been successfully unsubscribed.")
      })
      .catch((err: Error) => {
        setStatus("error")
        setMessage(err.message || "This link is invalid or has already been used.")
      })
  }, [token])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md border-2 border-foreground shadow-[6px_6px_0px_0px_oklch(0.1_0_0)]">

        <div className={`px-8 py-6 border-b-2 border-foreground ${
          status === "success" ? "bg-foreground" : status === "error" ? "bg-destructive" : "bg-foreground"
        }`}>
          <p className="text-[10px] uppercase tracking-[0.25em] text-background/40 mb-2">
            Newsletter
          </p>
          <h1 className="text-2xl font-black text-background">
            {status === "loading" ? "Processing…" : status === "success" ? "Unsubscribed" : "Invalid Link"}
          </h1>
        </div>

        <div className="px-8 py-10 flex flex-col items-center gap-4 text-center">
          {status === "loading" && (
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
          )}
          {status === "success" && (
            <CheckCircle2 className="h-10 w-10 text-foreground" />
          )}
          {status === "error" && (
            <XCircle className="h-10 w-10 text-destructive" />
          )}
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
            {status === "loading" ? "Please wait while we process your request…" : message}
          </p>
          {status === "success" && (
            <p className="text-xs text-muted-foreground">
              You will no longer receive emails from us. If this was a mistake,
              please contact us directly.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

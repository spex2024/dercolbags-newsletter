import { createFileRoute, Link } from "@tanstack/react-router"
import { ShieldX, Lock, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/forbidden")({
  component: ForbiddenPage,
})

function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6">
      <div className="relative">
        <div className="flex h-20 w-20 items-center justify-center border-2 border-foreground bg-card shadow-lg">
          <ShieldX className="h-10 w-10 text-destructive" />
        </div>
        <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center border-2 border-foreground bg-primary shadow-sm">
          <Lock className="h-4 w-4 text-primary-foreground" />
        </div>
      </div>

      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold tracking-tight">Access Denied</h1>
        <p className="mt-3 text-muted-foreground">
          Your role does not have permission to view this page. Contact an administrator if you
          believe this is an error.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild variant="outline" className="border-2 shadow-sm">
          <Link to="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  )
}

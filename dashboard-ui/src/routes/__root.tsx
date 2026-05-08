import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  useRouter,
} from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { TanStackDevtools } from "@tanstack/react-devtools"
import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "@/lib/api"
import { BrandProvider } from "@/contexts/BrandContext"
import { InactivityWatcher } from "@/components/InactivityWatcher"
import { Toaster } from "@/components/ui/sonner"
import { AlertTriangle, RotateCcw, Home } from "lucide-react"

import appCss from "../styles.css?url"

import { Preloader } from "@/components/ui/preloader"

function RootErrorComponent({ error }: { error: Error }) {
  const router = useRouter()
  const message = error?.message || "An unexpected error occurred"
  const isDev = import.meta.env.DEV

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-lg border-2 border-foreground shadow-[6px_6px_0px_0px_oklch(0.1_0_0)]">
        {/* Header */}
        <div className="bg-destructive px-6 py-5 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-white shrink-0" />
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/60">Runtime error</p>
            <h1 className="text-xl font-black text-white">Something went wrong</h1>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {isDev && (
            <div className="border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-[10px] uppercase tracking-widest text-destructive mb-1">Error message</p>
              <p className="text-sm font-mono text-destructive break-all">{message}</p>
            </div>
          )}

          {!isDev && (
            <p className="text-sm text-muted-foreground">
              The page crashed unexpectedly. Try reloading — if the problem persists, contact support.
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => router.invalidate()}
              className="flex items-center gap-2 border-2 border-foreground px-4 py-2 text-xs font-bold uppercase tracking-wider shadow-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Retry
            </button>
            <a
              href="/dashboard"
              className="flex items-center gap-2 border-2 border-foreground bg-foreground text-background px-4 py-2 text-xs font-bold uppercase tracking-wider shadow-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              <Home className="h-3.5 w-3.5" />
              Dashboard
            </a>
          </div>
        </div>
      </div>

      {isDev && error?.stack && (
        <details className="mt-6 w-full max-w-lg">
          <summary className="text-[10px] uppercase tracking-widest text-muted-foreground cursor-pointer mb-2">
            Stack trace
          </summary>
          <pre className="border p-4 text-[10px] font-mono text-muted-foreground overflow-auto max-h-64 bg-muted/30">
            {error.stack}
          </pre>
        </details>
      )}
    </main>
  )
}

function NotFoundComponent() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-md border-2 border-foreground shadow-[6px_6px_0px_0px_oklch(0.1_0_0)]">
        <div className="bg-foreground px-6 py-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-background/40 mb-1">Error</p>
          <h1 className="text-5xl font-black text-background">404</h1>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 border-2 border-foreground bg-foreground text-background px-4 py-2 text-xs font-bold uppercase tracking-wider shadow-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            <Home className="h-3.5 w-3.5" />
            Go to Dashboard
          </a>
        </div>
      </div>
    </main>
  )
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Newsletter Dashboard" },
      {
        name: "description",
        content: "Manage your newsletter subscribers, campaigns, and templates",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "https://res.cloudinary.com/ddwet1dzj/image/upload/v1777042366/dercolbags/DERCOLBAGS_LOGO_tolkgw.png" },
    ],
  }),
  errorComponent: ({ error }) => <RootErrorComponent error={error as Error} />,
  notFoundComponent: () => <NotFoundComponent />,
  pendingComponent: () => <Preloader />,
  pendingMs: 800,
  pendingMinMs: 0,
  component: RootComponent,
  shellComponent: RootDocument,
})

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrandProvider>
        <InactivityWatcher />
        <Outlet />
        <Toaster richColors position="top-right" />
      </BrandProvider>
    </QueryClientProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        {children}
        <TanStackDevtools
          config={{ position: "bottom-right" }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}

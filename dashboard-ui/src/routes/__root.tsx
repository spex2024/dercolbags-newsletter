import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { TanStackDevtools } from "@tanstack/react-devtools"
import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "@/lib/api"
import { BrandProvider } from "@/contexts/BrandContext"
import { Toaster } from "@/components/ui/sonner"

import appCss from "../styles.css?url"

import { Preloader } from "@/components/ui/preloader"

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
  notFoundComponent: () => (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        The requested page could not be found.
      </p>
      <a
        href="/dashboard"
        className="mt-6 text-sm font-medium text-primary underline underline-offset-4"
      >
        Go to Dashboard
      </a>
    </main>
  ),
  pendingComponent: () => <Preloader />,
  pendingMs: 150,
  pendingMinMs: 1500,
  component: RootComponent,
  shellComponent: RootDocument,
})

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrandProvider>
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

import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { authClient } from "@/lib/auth"
import { useEffect } from "react"
import { Preloader } from "@/components/ui/preloader"

export const Route = createFileRoute("/")({
  component: IndexPage,
})

function IndexPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const minDelay = new Promise(resolve => setTimeout(resolve, 5000))
    const sessionCheck = authClient.getSession()

    Promise.all([sessionCheck, minDelay])
      .then(([{ data: session }]) => {
        navigate({ to: session ? "/dashboard" : "/login", replace: true })
      })
      .catch(() => {
        navigate({ to: "/login", replace: true })
      })
  }, [navigate])

  return <Preloader />
}

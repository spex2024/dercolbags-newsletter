import { createAuthClient } from "better-auth/react"

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080"

export const authClient = createAuthClient({ baseURL: BASE_URL })

export const { useSession, signIn, signOut, signUp } = authClient

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useSession } from "@/lib/auth"
import type { Brand } from "@/services/api/types"

const ALL_BRANDS: Brand[] = ["dercolbags", "watpak"]
const FULL_ACCESS_ROLES = ["owner", "admin"]
const STORAGE_KEY = "selected-brand"

interface BrandContextType {
  currentBrand: Brand
  setCurrentBrand: (brand: Brand) => void
  allowedBrands: Brand[]
}

const BrandContext = createContext<BrandContextType | undefined>(undefined)

export function BrandProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession()

  const allowedBrands: Brand[] = (() => {
    if (!session) return ALL_BRANDS
    const role = (session.user as any)?.role as string | undefined
    if (role && FULL_ACCESS_ROLES.includes(role)) return ALL_BRANDS
    const access = (session.user as any)?.brandAccess as Brand[] | undefined
    return access && access.length > 0 ? access : ALL_BRANDS
  })()

  const [currentBrand, setCurrentBrandRaw] = useState<Brand>(() => {
    const stored =
      typeof window !== "undefined"
        ? (localStorage.getItem(STORAGE_KEY) as Brand | null)
        : null
    return stored && ALL_BRANDS.includes(stored) ? stored : "dercolbags"
  })

  // When allowedBrands resolves (after session loads), clamp currentBrand
  useEffect(() => {
    if (!allowedBrands.includes(currentBrand)) {
      const fallback = allowedBrands[0] ?? "dercolbags"
      setCurrentBrandRaw(fallback)
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, fallback)
      }
    }
  }, [allowedBrands, currentBrand])

  const setCurrentBrand = (brand: Brand) => {
    if (!allowedBrands.includes(brand)) return
    setCurrentBrandRaw(brand)
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, brand)
    }
  }

  return (
    <BrandContext.Provider value={{ currentBrand, setCurrentBrand, allowedBrands }}>
      {children}
    </BrandContext.Provider>
  )
}

export function useBrand() {
  const context = useContext(BrandContext)
  if (!context) throw new Error("useBrand must be used within a BrandProvider")
  return context
}

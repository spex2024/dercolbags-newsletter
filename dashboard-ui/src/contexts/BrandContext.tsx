import { createContext, useContext, useState, type ReactNode } from "react"
import type { Brand } from "@/services/api/types"

interface BrandContextType {
  currentBrand: Brand
  setCurrentBrand: (brand: Brand) => void
}

const BrandContext = createContext<BrandContextType | undefined>(undefined)

export function BrandProvider({ children }: { children: ReactNode }) {
  const [currentBrand, setCurrentBrand] = useState<Brand>(
    () =>
      (typeof window !== "undefined" &&
        (localStorage.getItem("selected-brand") as Brand)) ||
      "dercolbags",
  )

  const handleSetBrand = (brand: Brand) => {
    setCurrentBrand(brand)
    if (typeof window !== "undefined") {
      localStorage.setItem("selected-brand", brand)
    }
  }

  return (
    <BrandContext.Provider
      value={{ currentBrand, setCurrentBrand: handleSetBrand }}
    >
      {children}
    </BrandContext.Provider>
  )
}

export function useBrand() {
  const context = useContext(BrandContext)
  if (!context) {
    throw new Error("useBrand must be used within a BrandProvider")
  }
  return context
}

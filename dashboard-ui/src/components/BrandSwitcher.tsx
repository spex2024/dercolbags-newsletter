import { useBrand } from "@/contexts/BrandContext"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"
import type { Brand } from "@/services/api/types"

const brandConfig: Record<Brand, { name: string; color: string }> = {
  watpak: {
    name: "WatPak",
    color: "#FFC107",
  },
  dercolbags: {
    name: "DercolBags",
    color: "#1a1a1a",
  },
}

export function BrandSwitcher() {
  const { currentBrand, setCurrentBrand } = useBrand()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="gap-2" />}>
          <span
            className="h-2.5 w-2.5 ring-1 ring-black/10"
            style={{ backgroundColor: brandConfig[currentBrand].color }}
          />
          <span className="font-medium">
            {brandConfig[currentBrand].name}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {(Object.entries(brandConfig) as [Brand, { name: string; color: string }][]).map(
          ([key, value]) => (
            <DropdownMenuItem
              key={key}
              onClick={() => setCurrentBrand(key)}
              className={currentBrand === key ? "bg-accent" : ""}
            >
              <span
                className="mr-2 h-2.5 w-2.5 ring-1 ring-black/10"
                style={{ backgroundColor: value.color }}
              />
              {value.name}
            </DropdownMenuItem>
          ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

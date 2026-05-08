import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { requirePageAccess } from "@/lib/permissions"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { subscribersApi } from "@/services/api/subscribers"
import { useBrand } from "@/contexts/BrandContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ArrowLeft, Loader2 } from "lucide-react"
import { toast } from "sonner"

export const Route = createFileRoute("/_authenticated/subscribers/new")({
  beforeLoad: ({ context }) => requirePageAccess(context, "subscribers"),
  component: NewSubscriberPage,
})

const schema = z.object({
  name:     z.string().optional(),
  email:    z.string().email("Invalid email address"),
  phone:    z.string().optional(),
  location: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

function NewSubscriberPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { currentBrand } = useBrand()

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const createMutation = useMutation({
    mutationFn: (data: FormValues) =>
      subscribersApi.create({ ...data, brand: currentBrand, source: "manual" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscribers"] })
      toast.success("Subscriber added")
      navigate({ to: "/subscribers" })
    },
    onError: (err: Error) => toast.error(err.message || "Failed to add subscriber"),
  })

  return (
    <div className="mx-auto max-w-2xl">

      {/* Nav */}
      <button
        className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => navigate({ to: "/subscribers" })}
      >
        <ArrowLeft className="h-4 w-4" />
        Subscribers
      </button>

      {/* Form card */}
      <div className="border-2 border-foreground shadow-[6px_6px_0px_0px_oklch(0.1_0_0)] divide-y-2 divide-foreground">

        {/* Header */}
        <div className="bg-foreground text-background px-8 py-7">
          <p className="text-[10px] uppercase tracking-[0.25em] text-background/40 mb-2">
            {currentBrand === "watpak" ? "WatPak" : "DercolBags"} · Subscribers
          </p>
          <h1 className="text-3xl font-black tracking-tight">Add Subscriber</h1>
          <p className="mt-1.5 text-sm text-background/50">
            Manually add a new subscriber to your mailing list.
          </p>
        </div>

        {/* Fields */}
        <form onSubmit={handleSubmit((data) => createMutation.mutate(data))}>
          <div className="px-8 py-8 space-y-6">

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                  Name <span className="text-muted-foreground/50 normal-case tracking-normal font-normal">(optional)</span>
                </Label>
                <Input id="name" placeholder="e.g. Jane Smith" {...register("name")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input id="email" type="email" placeholder="jane@example.com" {...register("email")} />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                  Phone <span className="text-muted-foreground/50 normal-case tracking-normal font-normal">(optional)</span>
                </Label>
                <Input id="phone" placeholder="+233 20 000 0000" {...register("phone")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                  Location <span className="text-muted-foreground/50 normal-case tracking-normal font-normal">(optional)</span>
                </Label>
                <Input id="location" placeholder="e.g. Accra, Ghana" {...register("location")} />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-8 py-5 bg-muted/30 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Source will be recorded as <strong>manual</strong>.
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="shadow-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                onClick={() => navigate({ to: "/subscribers" })}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="shadow-md hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Subscriber
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

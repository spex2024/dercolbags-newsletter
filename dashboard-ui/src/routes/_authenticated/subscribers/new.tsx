import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { requirePageAccess } from "@/lib/permissions"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { subscribersApi } from "@/services/api/subscribers"
import { useBrand } from "@/contexts/BrandContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
  name: z.string().optional(),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  location: z.string().optional(),
  source: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

function NewSubscriberPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { currentBrand } = useBrand()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { source: "manual" },
  })

  const createMutation = useMutation({
    mutationFn: (data: FormValues) =>
      subscribersApi.create({ ...data, brand: currentBrand }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscribers"] })
      toast.success("Subscriber added successfully")
      navigate({ to: "/subscribers" })
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add subscriber")
    },
  })

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate({ to: "/subscribers" })}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Subscribers
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Add New Subscriber</CardTitle>
          <CardDescription>
            Add a new subscriber to your{" "}
            {currentBrand === "watpak" ? "WatPak" : "DercolBags"} mailing list
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit((data) => createMutation.mutate(data))}
            className="space-y-6"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name (optional)</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  {...register("name")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input
                  id="phone"
                  placeholder="+1234567890"
                  {...register("phone")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location (optional)</Label>
                <Input
                  id="location"
                  placeholder="Ghana"
                  {...register("location")}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate({ to: "/subscribers" })}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Add Subscriber
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

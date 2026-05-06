import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { requirePageAccess } from "@/lib/permissions"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { mailingListsApi } from "@/services/api/mailing-lists"
import { useBrand } from "@/contexts/BrandContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ArrowLeft, Loader2 } from "lucide-react"
import { toast } from "sonner"

export const Route = createFileRoute("/_authenticated/lists/new")({
  beforeLoad: ({ context }) => requirePageAccess(context, "lists"),
  component: NewListPage,
})

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  isDynamic: z.boolean().optional(),
})

type FormValues = z.infer<typeof schema>

function NewListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { currentBrand } = useBrand()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { isDynamic: false },
  })

  const createMutation = useMutation({
    mutationFn: (data: FormValues) =>
      mailingListsApi.create({ ...data, brand: currentBrand }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mailing-lists"] })
      toast.success("Mailing list created")
      navigate({ to: "/lists" })
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create list")
    },
  })

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate({ to: "/lists" })}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Mailing Lists
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Create Mailing List</CardTitle>
          <CardDescription>
            Create a new mailing list for{" "}
            {currentBrand === "watpak" ? "WatPak" : "DercolBags"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit((data) => createMutation.mutate(data))}
            className="space-y-6"
          >
            <div className="space-y-2">
              <Label htmlFor="name">
                List Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="VIP Customers"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="A list of our most engaged subscribers..."
                {...register("description")}
              />
            </div>

            <div className="flex items-center gap-3 bg-muted/50 p-4">
              <Checkbox
                id="isDynamic"
                checked={watch("isDynamic")}
                onCheckedChange={(v) => setValue("isDynamic", !!v)}
              />
              <div>
                <Label htmlFor="isDynamic" className="cursor-pointer">
                  Dynamic List
                </Label>
                <p className="text-xs text-muted-foreground">
                  Automatically adds subscribers matching filter criteria
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate({ to: "/lists" })}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create List
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

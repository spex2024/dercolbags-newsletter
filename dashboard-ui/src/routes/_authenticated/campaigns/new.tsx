import { useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { requirePageAccess } from "@/lib/permissions"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { campaignsApi } from "@/services/api/campaigns"
import { mailingListsApi } from "@/services/api/mailing-lists"
import { useBrand } from "@/contexts/BrandContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import { Checkbox } from "@/components/ui/checkbox"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ArrowLeft, Loader2, Send, Clock } from "lucide-react"
import { toast } from "sonner"

export const Route = createFileRoute("/_authenticated/campaigns/new")({
  beforeLoad: ({ context }) => requirePageAccess(context, "campaigns"),
  component: NewCampaignPage,
})

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  subject: z.string().min(1, "Subject is required"),
  preheader: z.string().optional(),
  content: z.string().min(1, "Content is required"),
  targetType: z.enum(["all", "list"]),
  targetId: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

function NewCampaignPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { currentBrand } = useBrand()
  const [isScheduling, setIsScheduling] = useState(false)
  const [scheduledDate, setScheduledDate] = useState("")

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { targetType: "all", content: "" },
  })

  const targetType = watch("targetType")

  const { data: listsData } = useQuery({
    queryKey: ["mailing-lists", currentBrand],
    queryFn: () => mailingListsApi.list({ brand: currentBrand }),
  })

  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const result = await campaignsApi.create({
        ...data,
        brand: currentBrand,
      })
      if (isScheduling && scheduledDate) {
        await campaignsApi.schedule(result.data.id, scheduledDate)
      }
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] })
      toast.success("Campaign created successfully")
      navigate({ to: "/campaigns" })
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create campaign")
    },
  })

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate({ to: "/campaigns" })}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Campaigns
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Create Campaign</CardTitle>
          <CardDescription>
            Create and send an email campaign to your subscribers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit((data) => {
              // Convert plain text to simple HTML formatting
              const htmlContent = data.content
                .split(/\n\s*\n/)
                .filter(Boolean)
                .map(
                  (paragraph) =>
                    `<p style="font-size: 16px; color: #000000; line-height: 160%; margin-bottom: 16px;">${paragraph.replace(/\n/g, "<br />")}</p>`,
                )
                .join("\n")

              createMutation.mutate({ ...data, content: htmlContent })
            })}
            className="space-y-6"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Campaign Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Summer Sale 2024"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">
                  Email Subject <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="subject"
                  placeholder="Don't miss our summer sale!"
                  {...register("subject")}
                />
                {errors.subject && (
                  <p className="text-xs text-destructive">
                    {errors.subject.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="preheader">Preheader Text (optional)</Label>
              <Input
                id="preheader"
                placeholder="Preview text that appears after subject..."
                {...register("preheader")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">
                Email Content (Plain Text){" "}
                <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="content"
                placeholder="Hello {{name}}!&#10;&#10;Write your message here... Just hit Enter twice for a new paragraph."
                className="min-h-[250px] text-sm"
                {...register("content")}
              />
              {errors.content && (
                <p className="text-xs text-destructive">
                  {errors.content.message}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Target Audience</Label>
                <Select
                  value={targetType}
                  onValueChange={(v) =>
                    setValue("targetType", v as "all" | "list")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subscribers</SelectItem>
                    <SelectItem value="list">Mailing List</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {targetType === "list" && (
                <div className="space-y-2">
                  <Label>Mailing List</Label>
                  <Select
                    onValueChange={(v) => setValue("targetId", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select list" />
                    </SelectTrigger>
                    <SelectContent>
                      {listsData?.data?.items?.map((list) => (
                        <SelectItem key={list.id} value={list.id}>
                          {list.name} ({list.subscriberCount})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 bg-muted/50 p-4">
              <Checkbox
                id="schedule"
                checked={isScheduling}
                onCheckedChange={(v) => setIsScheduling(!!v)}
              />
              <Label htmlFor="schedule" className="cursor-pointer">
                Schedule for later
              </Label>
              {isScheduling && (
                <Input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="ml-auto w-auto"
                />
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate({ to: "/campaigns" })}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : isScheduling ? (
                  <Clock className="mr-2 h-4 w-4" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {isScheduling ? "Schedule Campaign" : "Create Campaign"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

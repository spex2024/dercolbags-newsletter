import { useRef, useImperativeHandle, forwardRef, useState, useCallback } from "react"
import EmailEditor, { type EditorRef, type EmailEditorProps } from "react-email-editor"
import { ImageUploadDialog } from "./ImageUploadDialog"

interface EmailBuilderProps {
  designJson?: Record<string, unknown>
  minHeight?: string
  onReady?: () => void
}

export interface EmailBuilderRef {
  exportHtml: () => Promise<{ html: string; design: Record<string, unknown> }>
  loadDesign: (design: Record<string, unknown>) => void
}

export const EmailBuilder = forwardRef<EmailBuilderRef, EmailBuilderProps>(
  function EmailBuilder({ designJson, minHeight = "700px", onReady }, ref) {
    const emailEditorRef = useRef<EditorRef>(null)

    // Image upload dialog state
    const [imageDialogOpen, setImageDialogOpen] = useState(false)
    const imageDoneRef = useRef<((result: { url: string }) => void) | null>(null)

    const handleImageSelect = useCallback((url: string) => {
      imageDoneRef.current?.({ url })
      imageDoneRef.current = null
    }, [])

    const handleImageDialogClose = useCallback(() => {
      setImageDialogOpen(false)
      imageDoneRef.current = null
    }, [])

    const handleReady: EmailEditorProps["onReady"] = () => {
      const editor = emailEditorRef.current?.editor
      if (!editor) return

      // Load initial design
      if (designJson) {
        editor.loadDesign(designJson as any)
      }

      // Intercept Unlayer's image picker with our custom dialog
      ;(editor as any).registerCallback(
        "selectImage",
        (_data: unknown, done: (result: { url: string }) => void) => {
          imageDoneRef.current = done
          setImageDialogOpen(true)
        },
      )

      onReady?.()
    }

    useImperativeHandle(ref, () => ({
      exportHtml: () =>
        new Promise((resolve) => {
          emailEditorRef.current?.editor?.exportHtml(
            (data: { html: string; design: Record<string, unknown> }) => {
              resolve(data)
            },
          )
        }),
      loadDesign: (design: Record<string, unknown>) => {
        emailEditorRef.current?.editor?.loadDesign(design as any)
      },
    }))

    return (
      <>
        <div style={{ minHeight }} className="overflow-hidden border bg-white">
          <EmailEditor
            ref={emailEditorRef}
            onReady={handleReady}
            minHeight={minHeight}
            options={{
              displayMode: "email",
              features: {
                textEditor: { spellChecker: true },
              },
              appearance: {
                theme: "modern_light",
                panels: { tools: { dock: "left" } },
              },
              tools: {
                text: { enabled: true },
                image: { enabled: true },
                button: { enabled: true },
                divider: { enabled: true },
                html: { enabled: true },
                heading: { enabled: true },
                social: { enabled: true },
                timer: { enabled: false },
                video: { enabled: false },
              },
              mergeTags: {
                brandName: { name: "Brand Name", value: "{{brandName}}" },
                subscriberName: { name: "Subscriber Name", value: "{{name}}" },
                firstName: { name: "First Name", value: "{{firstName}}" },
                email: { name: "Email", value: "{{email}}" },
                phone: { name: "Phone", value: "{{phone}}" },
                location: { name: "Location", value: "{{location}}" },
                unsubscribeUrl: { name: "Unsubscribe URL", value: "{{unsubscribeUrl}}" },
                dashboardUrl: { name: "Dashboard URL", value: "{{dashboardUrl}}" },
                campaignTitle: { name: "Campaign Title", value: "{{campaignTitle}}" },
                campaignContent: { name: "Campaign Content", value: "{{campaignContent}}" },
                ctaText: { name: "CTA Text", value: "{{ctaText}}" },
                ctaUrl: { name: "CTA URL", value: "{{ctaUrl}}" },
              },
            }}
          />
        </div>

        <ImageUploadDialog
          open={imageDialogOpen}
          onSelect={handleImageSelect}
          onClose={handleImageDialogClose}
        />
      </>
    )
  },
)

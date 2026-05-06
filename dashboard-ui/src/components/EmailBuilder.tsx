import { useRef, useImperativeHandle, forwardRef } from "react"
import EmailEditor, { type EditorRef, type EmailEditorProps } from "react-email-editor"

interface EmailBuilderProps {
  /** Initial design JSON to load into the editor */
  designJson?: Record<string, unknown>
  /** Minimum height for the editor */
  minHeight?: string
  /** Callback when editor is ready */
  onReady?: () => void
}

export interface EmailBuilderRef {
  /** Export the current design as HTML */
  exportHtml: () => Promise<{ html: string; design: Record<string, unknown> }>
  /** Load a design JSON into the editor */
  loadDesign: (design: Record<string, unknown>) => void
}

/**
 * A wrapper around Unlayer's React Email Editor that provides
 * a simplified API for loading designs and exporting HTML/JSON.
 */
export const EmailBuilder = forwardRef<EmailBuilderRef, EmailBuilderProps>(
  function EmailBuilder({ designJson, minHeight = "700px", onReady }, ref) {
    const emailEditorRef = useRef<EditorRef>(null)

    const handleReady: EmailEditorProps["onReady"] = () => {
      if (designJson && emailEditorRef.current?.editor) {
        emailEditorRef.current.editor.loadDesign(designJson as any)
      }
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
      <div
        style={{ minHeight }}
        className="overflow-hidden border bg-white"
      >
        <EmailEditor
          ref={emailEditorRef}
          onReady={handleReady}
          minHeight={minHeight}
          options={{
            displayMode: "email",
            features: {
              textEditor: {
                spellChecker: true,
              },
            },
            appearance: {
              theme: "modern_light",
              panels: {
                tools: {
                  dock: "left",
                },
              },
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
    )
  },
)

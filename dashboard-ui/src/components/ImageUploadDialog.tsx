import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { UploadDropzone } from "@/lib/uploadthing"
import { Link, Upload, X, ImageIcon } from "lucide-react"

interface ImageUploadDialogProps {
  open: boolean
  onSelect: (url: string) => void
  onClose: () => void
}

export function ImageUploadDialog({ open, onSelect, onClose }: ImageUploadDialogProps) {
  const [tab, setTab] = useState<"upload" | "url">("upload")
  const [urlInput, setUrlInput] = useState("")
  const [urlError, setUrlError] = useState("")

  if (!open) return null

  const handleUrlConfirm = () => {
    if (!urlInput.trim()) {
      setUrlError("Please enter a URL")
      return
    }
    try {
      new URL(urlInput)
    } catch {
      setUrlError("Please enter a valid URL")
      return
    }
    onSelect(urlInput.trim())
    setUrlInput("")
    setUrlError("")
    onClose()
  }

  const handleClose = () => {
    setUrlInput("")
    setUrlError("")
    setTab("upload")
    onClose()
  }

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      {/* Dialog */}
      <div className="w-full max-w-lg border-2 border-foreground bg-background shadow-[8px_8px_0px_0px_oklch(0.1_0_0)]">

        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-foreground bg-foreground px-6 py-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-background" />
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-background">
              Insert Image
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-background/60 hover:text-background transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b-2 border-foreground">
          <button
            onClick={() => setTab("upload")}
            className={`flex flex-1 items-center justify-center gap-2 px-6 py-3 text-[11px] font-bold uppercase tracking-wider border-r-2 border-foreground transition-colors ${
              tab === "upload"
                ? "bg-foreground text-background"
                : "hover:bg-muted/40 text-muted-foreground"
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            Upload File
          </button>
          <button
            onClick={() => setTab("url")}
            className={`flex flex-1 items-center justify-center gap-2 px-6 py-3 text-[11px] font-bold uppercase tracking-wider transition-colors ${
              tab === "url"
                ? "bg-foreground text-background"
                : "hover:bg-muted/40 text-muted-foreground"
            }`}
          >
            <Link className="h-3.5 w-3.5" />
            Enter URL
          </button>
        </div>

        {/* Upload tab */}
        {tab === "upload" && (
          <div className="p-6">
            <UploadDropzone
              endpoint="emailImageUploader"
              onClientUploadComplete={(res) => {
                const file = res?.[0]
                if (file?.ufsUrl) {
                  onSelect(file.ufsUrl)
                  onClose()
                }
              }}
              onUploadError={(err) => {
                console.error("Upload error:", err)
              }}
              appearance={{
                container:
                  "border-2 border-dashed border-foreground/30 hover:border-foreground/60 transition-colors bg-muted/10 cursor-pointer rounded-none",
                uploadIcon: "text-muted-foreground",
                label: "text-sm font-semibold text-foreground",
                allowedContent: "text-[11px] text-muted-foreground",
                button:
                  "bg-foreground text-background text-[11px] uppercase tracking-wider font-bold rounded-none shadow-md hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all ut-uploading:bg-foreground/70",
              }}
            />
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Max file size: 8MB · JPG, PNG, GIF, WebP, SVG
            </p>
          </div>
        )}

        {/* URL tab */}
        {tab === "url" && (
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Image URL
              </p>
              <Input
                placeholder="https://example.com/image.jpg"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value)
                  setUrlError("")
                }}
                onKeyDown={(e) => { if (e.key === "Enter") handleUrlConfirm() }}
                autoFocus
              />
              {urlError && (
                <p className="text-xs text-destructive">{urlError}</p>
              )}
            </div>

            {/* Preview */}
            {urlInput && !urlError && (
              <div className="border-2 border-foreground/20 p-2">
                <img
                  src={urlInput}
                  alt="preview"
                  className="mx-auto max-h-48 max-w-full object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none"
                  }}
                  onLoad={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "block"
                  }}
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleUrlConfirm}
                disabled={!urlInput.trim()}
                className="shadow-md hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                Insert Image
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

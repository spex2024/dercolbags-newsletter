import { useState, useRef } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { requirePageAccess } from "@/lib/permissions"
import { useMutation } from "@tanstack/react-query"
import { importExportApi } from "@/services/api/import-export"
import { useBrand } from "@/contexts/BrandContext"
import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, Download, Loader2, FileSpreadsheet, X, FileText } from "lucide-react"
import { toast } from "sonner"

export const Route = createFileRoute("/_authenticated/import-export")({
  beforeLoad: ({ context }) => requirePageAccess(context, "import-export"),
  component: ImportExportPage,
})

function ImportExportPage() {
  const { currentBrand } = useBrand()
  const fileInputRef      = useRef<HTMLInputElement>(null)
  const [importFile, setImportFile]         = useState<File | null>(null)
  const [skipDuplicates, setSkipDuplicates] = useState(false)
  const [exportFormat, setExportFormat]     = useState<"csv" | "xlsx">("csv")

  const importMutation = useMutation({
    mutationFn: () => importExportApi.importSubscribers(currentBrand, importFile!, { skipDuplicates }),
    onSuccess: (result) => {
      const { success, failed, suppressed } = result.data as {
        success?: number; failed?: number; suppressed?: number; fileName?: string
      }
      const parts: string[] = []
      if (success)     parts.push(`${success} imported`)
      if (suppressed)  parts.push(`${suppressed} suppressed (unsubscribed)`)
      if (failed)      parts.push(`${failed} failed`)
      toast.success(parts.length ? parts.join(" · ") : "Import complete")
      setImportFile(null)
    },
    onError: (err: Error) => toast.error(err.message || "Import failed"),
  })

  const exportMutation = useMutation({
    mutationFn: () => importExportApi.exportSubscribers(currentBrand, exportFormat),
    onSuccess: () => toast.success("Export started — your file will be ready shortly"),
    onError: (err: Error) => toast.error(err.message || "Export failed"),
  })

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-6 border-b-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1">Tools</p>
          <h1 className="text-4xl font-black tracking-tight">Import / Export</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bulk import subscribers from a file or export your list
          </p>
        </div>
      </div>

      <Tabs defaultValue="import" className="space-y-6">
        <TabsList variant="line">
          <TabsTrigger value="import" className="gap-2">
            <Upload className="h-4 w-4" />
            Import
          </TabsTrigger>
          <TabsTrigger value="export" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </TabsTrigger>
        </TabsList>

        {/* ── Import ── */}
        <TabsContent value="import">
          <div className="border-2 border-foreground shadow-[4px_4px_0px_0px_oklch(0.1_0_0)] divide-y-2 divide-foreground max-w-2xl">

            <div className="bg-foreground text-background px-7 py-5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-background/40 mb-1">Import</p>
              <h2 className="text-xl font-black">Upload Subscribers</h2>
            </div>

            <div className="px-7 py-7 space-y-6">
              <div className="text-sm text-muted-foreground leading-relaxed">
                Upload a CSV or Excel file. Required column:{" "}
                <code className="bg-muted px-1.5 py-0.5 text-xs font-mono border border-border">email</code>.
                {" "}Optional:{" "}
                <code className="bg-muted px-1.5 py-0.5 text-xs font-mono border border-border">name</code>{" "}
                <code className="bg-muted px-1.5 py-0.5 text-xs font-mono border border-border">phone</code>{" "}
                <code className="bg-muted px-1.5 py-0.5 text-xs font-mono border border-border">location</code>
              </div>

              {/* Drop zone */}
              <div
                className="cursor-pointer border-2 border-dashed border-foreground/20 p-10 text-center hover:border-foreground/40 hover:bg-muted/20 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                />
                {importFile ? (
                  <div className="flex items-center justify-center gap-4">
                    <FileSpreadsheet className="h-10 w-10 text-foreground shrink-0" />
                    <div className="text-left">
                      <p className="text-sm font-semibold">{importFile.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {(importFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      className="ml-2 p-1.5 hover:bg-muted transition-colors rounded"
                      onClick={(e) => { e.stopPropagation(); setImportFile(null) }}
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <Upload className="h-10 w-10 text-muted-foreground/40" />
                    <div>
                      <p className="text-sm font-semibold">Click to upload a file</p>
                      <p className="text-xs text-muted-foreground mt-1">CSV, XLS, or XLSX — max 10 MB</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Options */}
              <div className="flex items-center gap-3">
                <Checkbox
                  id="skipDuplicates"
                  checked={skipDuplicates}
                  onCheckedChange={(v) => setSkipDuplicates(!!v)}
                />
                <Label htmlFor="skipDuplicates" className="cursor-pointer text-sm">
                  Skip duplicate emails (don't overwrite existing data)
                </Label>
              </div>
            </div>

            <div className="px-7 py-5 bg-muted/30 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Existing subscribers will be <strong>updated</strong> unless skip duplicates is on.
              </p>
              <Button
                onClick={() => importMutation.mutate()}
                disabled={!importFile || importMutation.isPending}
                className="shadow-md hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                {importMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Start Import
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* ── Export ── */}
        <TabsContent value="export">
          <div className="border-2 border-foreground shadow-[4px_4px_0px_0px_oklch(0.1_0_0)] divide-y-2 divide-foreground max-w-2xl">

            <div className="bg-foreground text-background px-7 py-5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-background/40 mb-1">Export</p>
              <h2 className="text-xl font-black">Download Subscribers</h2>
            </div>

            <div className="px-7 py-7 space-y-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Export all subscribers for the current brand as a spreadsheet.
                Includes: name, email, phone, location, source, status, and subscription state.
              </p>

              {/* Format picker */}
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                  Export format
                </Label>
                <div className="grid grid-cols-2 gap-3 max-w-xs">
                  {(["csv", "xlsx"] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setExportFormat(fmt)}
                      className={`flex items-center gap-3 border-2 px-4 py-3 text-left transition-all ${
                        exportFormat === fmt
                          ? "border-foreground bg-foreground text-background"
                          : "border-foreground/20 hover:border-foreground/40"
                      }`}
                    >
                      <FileText className="h-4 w-4 shrink-0" />
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider">
                          {fmt === "csv" ? "CSV" : "Excel"}
                        </p>
                        <p className={`text-[10px] ${exportFormat === fmt ? "text-background/60" : "text-muted-foreground"}`}>
                          {fmt === "csv" ? ".csv" : ".xlsx"}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-7 py-5 bg-muted/30 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Exports all subscribers for <strong className="capitalize">{currentBrand}</strong>.
              </p>
              <Button
                onClick={() => exportMutation.mutate()}
                disabled={exportMutation.isPending}
                className="shadow-md hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                {exportMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Export {exportFormat.toUpperCase()}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

import { useState, useRef } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { requirePageAccess } from "@/lib/permissions"
import { useMutation } from "@tanstack/react-query"
import { importExportApi } from "@/services/api/import-export"
import { useBrand } from "@/contexts/BrandContext"
import { Button } from "@/components/ui/button"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Upload,
  Download,
  Loader2,
  FileSpreadsheet,
  X,
} from "lucide-react"
import { toast } from "sonner"

export const Route = createFileRoute("/_authenticated/import-export")({
  beforeLoad: ({ context }) => requirePageAccess(context, "import-export"),
  component: ImportExportPage,
})

function ImportExportPage() {
  const { currentBrand } = useBrand()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [skipDuplicates, setSkipDuplicates] = useState(false)
  const [exportFormat, setExportFormat] = useState<"csv" | "xlsx">("csv")

  const importMutation = useMutation({
    mutationFn: () =>
      importExportApi.importSubscribers(currentBrand, importFile!, {
        skipDuplicates,
      }),
    onSuccess: (result) => {
      toast.success(`Import started: ${result.data.fileName}`)
      setImportFile(null)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Import failed")
    },
  })

  const exportMutation = useMutation({
    mutationFn: () =>
      importExportApi.exportSubscribers(currentBrand, exportFormat),
    onSuccess: () => {
      toast.success("Export started — your file will be ready shortly")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Export failed")
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Import / Export</h1>
        <p className="mt-1 text-muted-foreground">
          Import subscribers from files or export your data
        </p>
      </div>

      <Tabs defaultValue="import">
        <TabsList>
          <TabsTrigger value="import">
            <Upload className="mr-2 h-4 w-4" />
            Import
          </TabsTrigger>
          <TabsTrigger value="export">
            <Download className="mr-2 h-4 w-4" />
            Export
          </TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Import Subscribers</CardTitle>
              <CardDescription>
                Upload a CSV or Excel file to import subscribers. Required
                column: <code className="rounded bg-muted px-1 text-xs">email</code>. 
                Optional: <code className="rounded bg-muted px-1 text-xs">name</code>, 
                <code className="rounded bg-muted px-1 text-xs">phone</code>, 
                <code className="rounded bg-muted px-1 text-xs">location</code>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* File Upload Zone */}
              <div
                className="cursor-pointer border-2 border-dashed border-muted-foreground/20 p-8 text-center transition-colors hover:border-muted-foreground/40"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                />
                {importFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileSpreadsheet className="h-8 w-8 text-primary" />
                    <div className="text-left">
                      <p className="text-sm font-medium">{importFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(importFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation()
                        setImportFile(null)
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload or drag and drop
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      CSV, XLS, or XLSX files
                    </p>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Checkbox
                  id="skipDuplicates"
                  checked={skipDuplicates}
                  onCheckedChange={(v) => setSkipDuplicates(!!v)}
                />
                <Label htmlFor="skipDuplicates" className="cursor-pointer">
                  Skip duplicate emails
                </Label>
              </div>

              <Button
                onClick={() => importMutation.mutate()}
                disabled={!importFile || importMutation.isPending}
              >
                {importMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <Upload className="mr-2 h-4 w-4" />
                Start Import
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Export Subscribers</CardTitle>
              <CardDescription>
                Export your subscriber data to CSV or Excel format
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Export Format</Label>
                <Select
                  value={exportFormat}
                  onValueChange={(v) => setExportFormat(v as "csv" | "xlsx")}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={() => exportMutation.mutate()}
                disabled={exportMutation.isPending}
              >
                {exportMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <Download className="mr-2 h-4 w-4" />
                Start Export
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

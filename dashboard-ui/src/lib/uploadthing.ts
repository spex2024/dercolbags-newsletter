import {
  generateReactHelpers,
  generateUploadButton,
  generateUploadDropzone,
} from "@uploadthing/react"
import type { UploadRouter } from "../server/uploadthing"

// Point to the backend Hono server which hosts the UploadThing route handler
const uploadthingUrl = `${import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8080"}/api/uploadthing`

export const UploadButton = generateUploadButton<UploadRouter>({ url: uploadthingUrl })
export const UploadDropzone = generateUploadDropzone<UploadRouter>({ url: uploadthingUrl })
export const { useUploadThing } = generateReactHelpers<UploadRouter>({ url: uploadthingUrl })

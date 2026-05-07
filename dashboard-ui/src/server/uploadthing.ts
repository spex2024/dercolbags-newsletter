import { createUploadthing } from "uploadthing/server"
import type { FileRouter } from "uploadthing/server"

const f = createUploadthing()

export const uploadRouter = {
  emailImageUploader: f({
    image: {
      maxFileSize: "8MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      // Internal dashboard — all requests come from authenticated sessions.
      // Add session verification here if you need per-user restrictions.
      return {}
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl }
    }),
} satisfies FileRouter

export type UploadRouter = typeof uploadRouter

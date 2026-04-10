import { genUploader } from "uploadthing/react";

export const { uploadFiles, createUpload } = genUploader({
  url: "/api/uploadthing",
});

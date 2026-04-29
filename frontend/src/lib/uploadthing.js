import { generateReactHelpers } from "@uploadthing/react";
import { apiUrl } from "./apiUrl";

export const { uploadFiles, createUpload } = generateReactHelpers({
  url: apiUrl("/api/uploadthing"),
});

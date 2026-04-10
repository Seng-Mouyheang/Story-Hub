import { generateReactHelpers } from "@uploadthing/react";

export const { uploadFiles, createUpload } = generateReactHelpers({
  url: "/api/uploadthing",
});

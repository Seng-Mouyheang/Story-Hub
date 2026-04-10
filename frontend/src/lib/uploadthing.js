import { genUploader } from "uploadthing/client";

export const { uploadFiles } = genUploader({
  url: "/api/uploadthing",
  package: "@uploadthing/react",
});

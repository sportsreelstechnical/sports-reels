export interface FileUploadResult {
  signedUrl: string;
  key: string;
  objectPath: string;
}

export const fileUploadService = {
  /**
   * Request an upload URL from the server
   */
  async getUploadUrl(): Promise<FileUploadResult> {
    const response = await fetch("/api/object-storage/upload-url", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get upload URL: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Upload a file using the signed URL
   */
  async uploadFileToUrl(signedUrl: string, file: File): Promise<void> {
    const response = await fetch(signedUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to upload file to storage: ${response.statusText}`
      );
    }
  },

  /**
   * Helper to handle the full upload process
   * Returns the objectPath (e.g., "/objects/uploads/...")
   */
  async uploadFile(file: File): Promise<string> {
    const { signedUrl, objectPath } = await this.getUploadUrl();
    await this.uploadFileToUrl(signedUrl, file);
    return objectPath;
  },
};

export interface PresignedUploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

export interface PresignedUrlResponse {
  success: boolean;
  presignedUrl?: string;
  publicUrl?: string;
  key?: string;
  expiresIn?: number;
  error?: string;
}

export class PresignedUploadService {
  private baseUrl: string;

  constructor(baseUrl: string = import.meta.env.VITE_BACKEND_STORAGE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Get presigned URL from backend
   */
  private async getPresignedUrl(
    fileName: string,
    contentType: string,
    teamId: string,
    fileType: "video" | "thumbnail" = "video",
  ): Promise<PresignedUrlResponse> {
    try {
      // Generate a key (path) for the file in R2
      const folder = fileType === "video" ? "videos" : "thumbnails";
      const uniqueId =
        Date.now().toString(36) + Math.random().toString(36).substr(2);
      // Sanitize filename
      const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
      const key = `originals/${folder}/${uniqueId}/${safeName}`;

      const response = await fetch(`${this.baseUrl}/api/r2/presigned-put-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key,
          contentType,
          expiresIn: 3600,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        presignedUrl: data.presignedUrl,
        key,
      };
    } catch (error) {
      console.error("Error getting presigned URL:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Upload file using presigned URL
   */
  private async uploadToPresignedUrl(
    file: File | Blob,
    presignedUrl: string,
    onProgress?: (progress: number) => void,
  ): Promise<boolean> {
    try {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Track upload progress
        if (onProgress) {
          xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
              const progress = (event.loaded / event.total) * 100;
              onProgress(progress);
            }
          });
        }

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(true);
          } else {
            reject(new Error(`Upload failed with status: ${xhr.status}`));
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Upload failed"));
        });

        xhr.addEventListener("abort", () => {
          reject(new Error("Upload aborted"));
        });

        xhr.open("PUT", presignedUrl);
        xhr.setRequestHeader(
          "Content-Type",
          file.type || "application/octet-stream",
        );
        xhr.send(file);
      });
    } catch (error) {
      console.error("Error uploading to presigned URL:", error);
      return false;
    }
  }

  /**
   * Upload video file
   */
  async uploadVideo(
    videoFile: File | Blob,
    title: string,
    teamId: string,
    onProgress?: (progress: number) => void,
  ): Promise<PresignedUploadResult> {
    try {
      // Step 1: Get presigned URL
      const presignedResponse = await this.getPresignedUrl(
        title,
        "video/mp4",
        teamId,
        "video",
      );

      if (!presignedResponse.success || !presignedResponse.presignedUrl) {
        return {
          success: false,
          error: presignedResponse.error || "Failed to get presigned URL",
        };
      }

      // Step 2: Upload file to presigned URL
      const uploadSuccess = await this.uploadToPresignedUrl(
        videoFile,
        presignedResponse.presignedUrl,
        onProgress,
      );

      if (!uploadSuccess) {
        return {
          success: false,
          error: "Failed to upload file to presigned URL",
        };
      }

      return {
        success: true,
        url: presignedResponse.publicUrl,
        key: presignedResponse.key,
      };
    } catch (error) {
      console.error("Error uploading video:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown upload error",
      };
    }
  }

  /**
   * Upload thumbnail file
   */
  async uploadThumbnail(
    thumbnailBlob: Blob,
    title: string,
    teamId: string,
    onProgress?: (progress: number) => void,
  ): Promise<PresignedUploadResult> {
    try {
      // Step 1: Get presigned URL
      const presignedResponse = await this.getPresignedUrl(
        title,
        "image/jpeg",
        teamId,
        "thumbnail",
      );

      if (!presignedResponse.success || !presignedResponse.presignedUrl) {
        return {
          success: false,
          error: presignedResponse.error || "Failed to get presigned URL",
        };
      }

      // Step 2: Upload file to presigned URL
      const uploadSuccess = await this.uploadToPresignedUrl(
        thumbnailBlob,
        presignedResponse.presignedUrl,
        onProgress,
      );

      if (!uploadSuccess) {
        return {
          success: false,
          error: "Failed to upload thumbnail to presigned URL",
        };
      }

      return {
        success: true,
        url: presignedResponse.publicUrl,
        key: presignedResponse.key,
      };
    } catch (error) {
      console.error("Error uploading thumbnail:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown upload error",
      };
    }
  }

  /**
   * Check if backend service is available
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`);
      const data = await response.json();
      return data.success === true;
    } catch (error) {
      console.error("Health check failed:", error);
      return false;
    }
  }
}

// Export singleton instance
export const presignedUploadService = new PresignedUploadService();

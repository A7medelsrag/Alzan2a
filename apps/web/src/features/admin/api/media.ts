export interface UploadedAdminImage {
  url: string;
}

export async function uploadAdminImage(file: File, csrfToken: string): Promise<UploadedAdminImage> {
  const body = new FormData();
  body.append("file", file);

  const response = await fetch("/api/v1/admin/media/upload", {
    method: "POST",
    credentials: "include",
    headers: { "X-CSRF-Token": csrfToken },
    body,
  });
  const result = await response.json().catch(() => null) as {
    data?: { url?: unknown };
    error?: { code?: string };
  } | null;
  if (!response.ok || typeof result?.data?.url !== "string") {
    throw new Error(result?.error?.code || "UPLOAD_FAILED");
  }
  return { url: result.data.url };
}

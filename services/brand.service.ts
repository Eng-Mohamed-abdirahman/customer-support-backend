import type { ApiEnvelope } from "@/types/invitation"
import type { BrandIdentity, LogoUploadResult, PresignedUrlResult } from "@/types/brand"
import { getStoredToken } from "@/services/auth.service"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"

async function extractData<T>(response: Response, fallbackErrorMessage: string): Promise<T> {
  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | null

  if (!response.ok) {
    throw new Error(body?.message ?? fallbackErrorMessage)
  }

  if (body?.data === undefined) {
    throw new Error("Unexpected API response")
  }

  return body.data
}

/**
 * Gets the current brand identity for the user's organization.
 * Returns null if no brand identity exists yet.
 */
export async function getBrandIdentity(): Promise<BrandIdentity | null> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Please sign in to view brand settings")
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/brands/current`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return extractData<BrandIdentity | null>(
    response,
    "Failed to load brand settings. Please try again."
  )
}

/**
 * Saves or updates the brand identity.
 */
export async function saveBrandIdentity(payload: BrandIdentity): Promise<BrandIdentity> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Please sign in to save brand settings")
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/brands/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  return extractData<BrandIdentity>(
    response,
    "Failed to save brand settings. Please try again."
  )
}

/**
 * Upload a logo through the backend (server uploads to B2). Prefer this over presigned URLs.
 */
export async function uploadLogo(file: File): Promise<LogoUploadResult> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Please sign in to upload assets")
  }

  const formData = new FormData()
  formData.append("file", file)

  const response = await fetch(`${API_BASE_URL}/api/v1/storage/upload?type=logo`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })

  return extractData<LogoUploadResult>(response, "Failed to upload logo.")
}

/**
 * Request a presigned URL from the backend to upload the logo directly to storage.
 */
export async function getPresignedUploadUrl(
  filename: string,
  contentType: string
): Promise<PresignedUrlResult> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Please sign in to upload assets")
  }

  const queryParams = new URLSearchParams({
    filename,
    contentType,
    type: "logo",
  })

  const response = await fetch(`${API_BASE_URL}/api/v1/storage/presign?${queryParams.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return extractData<PresignedUrlResult>(
    response,
    "Failed to get presigned upload URL."
  )
}

/**
 * Directly upload the logo file to Backblaze B2 storage using the presigned URL.
 */
export async function uploadLogoToB2(
  uploadUrl: string,
  file: File,
  contentType: string
): Promise<void> {
  const resolvedContentType = contentType || file.type || "application/octet-stream"
  const body = new Blob([file], { type: resolvedContentType })

  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": resolvedContentType,
    },
    body,
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => "")
    throw new Error(
      errorText
        ? `Failed to upload logo to storage server: ${errorText}`
        : "Failed to upload logo to storage server."
    )
  }
}

export type BrandIdentity = {
  id?: string
  organizationId?: string
  brandName: string
  primaryColor: string
  secondaryColor: string
  fontStyle: string
  logoUrl: string
}

export type PresignedUrlResult = {
  uploadUrl: string
  publicUrl: string
}

"use client"

import {
  AlertCircle,
  ChevronRight,
  Eye,
  Info,
  Loader2,
  Lock,
  Palette,
  Save,
  UploadCloud,
  Image as ImageIcon,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { getBrandIdentity, saveBrandIdentity, uploadLogo } from "@/services/brand.service"
import { listMyCompanyUsers, updateMyCompanyProfile } from "@/services/company.service"
import type { BrandIdentity } from "@/types/brand"
import type { MyCompanyUsersResult } from "@/types/company"

const FONT_OPTIONS = [
  { value: "Inter", label: "Inter (Modern Sans-Serif)" },
  { value: "Playfair Display", label: "Playfair Display (Classic Serif)" },
  { value: "Outfit", label: "Outfit (Clean Geometric)" },
  { value: "Roboto", label: "Roboto (Technical)" },
]

export default function BrandSettingsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null)
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null)
  
  // Org details for profile syncing
  const [orgData, setOrgData] = useState<MyCompanyUsersResult | null>(null)

  // Form states
  const [brandName, setBrandName] = useState("")
  const [primaryColor, setPrimaryColor] = useState("#000000")
  const [secondaryColor, setSecondaryColor] = useState("#0058be")
  const [fontStyle, setFontStyle] = useState("Inter")
  const [logoUrl, setLogoUrl] = useState("")

  const [dragActive, setDragActive] = useState(false)
  const [logoPreviewVersion, setLogoPreviewVersion] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const logoPreviewSrc = pendingLogoFile ? localPreviewUrl : logoUrl
  const logoPreviewKey = pendingLogoFile
    ? `pending-${pendingLogoFile.name}-${pendingLogoFile.lastModified}-${pendingLogoFile.size}`
    : `${logoUrl}-${logoPreviewVersion}`

  // Fetch current brand identity and organization info
  const loadBrandInfo = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)

    try {
      setPendingLogoFile(null)
      setLocalPreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current)
        }
        return null
      })

      // Load brand settings
      const brand = await getBrandIdentity()
      if (brand) {
        setBrandName(brand.brandName || "")
        setPrimaryColor(brand.primaryColor || "#000000")
        setSecondaryColor(brand.secondaryColor || "#0058be")
        setFontStyle(brand.fontStyle || "Inter")
        setLogoUrl(brand.logoUrl || "")
      }

      // Load organization profile for syncing
      const companyData = await listMyCompanyUsers()
      setOrgData(companyData)
      if (!brand && companyData?.organization?.name) {
        // Fallback initial values from org profile
        setBrandName(companyData.organization.name)
        setLogoUrl(companyData.organization.profile.logoUrl || "")
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load brand configuration."
      setLoadError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadBrandInfo()
  }, [loadBrandInfo])

  useEffect(() => {
    return () => {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl)
      }
    }
  }, [localPreviewUrl])

  // Color picker handlers
  const handlePrimaryColorChange = (hex: string) => {
    let cleanHex = hex.trim()
    if (cleanHex && !cleanHex.startsWith("#")) {
      cleanHex = "#" + cleanHex
    }
    setPrimaryColor(cleanHex)
  }

  const handleSecondaryColorChange = (hex: string) => {
    let cleanHex = hex.trim()
    if (cleanHex && !cleanHex.startsWith("#")) {
      cleanHex = "#" + cleanHex
    }
    setSecondaryColor(cleanHex)
  }

  const handleLogoSelect = (file: File) => {
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"]
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload a PNG, JPEG, or SVG.")
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File is too large. Maximum size is 2MB.")
      return
    }

    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl)
    }

    setPendingLogoFile(file)
    setLocalPreviewUrl(URL.createObjectURL(file))
    setLogoPreviewVersion((version) => version + 1)
    toast.success("Logo selected. Click Save Brand Settings to upload.")

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleLogoSelect(file)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleLogoSelect(e.dataTransfer.files[0])
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  // Save brand settings
  const handleSaveBrand = async () => {
    const trimmedBrandName = brandName.trim()
    if (!trimmedBrandName) {
      toast.error("Brand Name is required.")
      return
    }

    // Hex verification helper
    const isValidHex = (color: string) => /^#[0-9A-Fa-f]{6}$/.test(color)

    if (!isValidHex(primaryColor)) {
      toast.error("Primary color must be a valid hex code (e.g. #000000).")
      return
    }

    if (!isValidHex(secondaryColor)) {
      toast.error("Secondary color must be a valid hex code (e.g. #FF5733).")
      return
    }

    if (!logoUrl && !pendingLogoFile) {
      toast.error("A company logo is required.")
      return
    }

    setIsSaving(true)
    const toastId = toast.loading("Saving brand guidelines...")

    try {
      let resolvedLogoUrl = logoUrl

      if (pendingLogoFile) {
        toast.loading("Uploading logo to storage...", { id: toastId })
        const uploadResult = await uploadLogo(pendingLogoFile)
        resolvedLogoUrl = uploadResult.publicUrl
        setLogoUrl(uploadResult.url || uploadResult.publicUrl)
        setPendingLogoFile(null)
        if (localPreviewUrl) {
          URL.revokeObjectURL(localPreviewUrl)
          setLocalPreviewUrl(null)
        }
      }

      const payload: BrandIdentity = {
        brandName: trimmedBrandName,
        primaryColor,
        secondaryColor,
        fontStyle,
        logoUrl: resolvedLogoUrl,
      }

      // 1. Save Brand Identity configuration
      const savedBrand = await saveBrandIdentity(payload)
      setLogoUrl(savedBrand.logoUrl)
      setLogoPreviewVersion((version) => version + 1)

      // 2. Sync organization profile name & logoUrl
      if (orgData?.organization) {
        await updateMyCompanyProfile({
          profile: {
            ...orgData.organization.profile,
            name: trimmedBrandName,
            logoUrl: resolvedLogoUrl,
          },
          contact: orgData.organization.contact,
          businessInfo: orgData.organization.businessInfo,
          supportSettings: orgData.organization.supportSettings,
          enabledFeatures: orgData.organization.enabledFeatures,
        })
      }

      toast.success("Brand settings saved successfully.", { id: toastId })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to save brand settings."
      toast.error(message, { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Card className="border border-border/70 overflow-hidden">
          <CardContent className="p-8 space-y-6">
            <Skeleton className="h-32 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <span>Account</span>
        <ChevronRight className="size-3.5" />
        <span className="text-primary font-semibold">Organization Brand</span>
      </nav>

      {/* Error alert */}
      {loadError && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Configuration Load Failed</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      {/* Main Settings Card */}
      <Card className="bg-card border border-border shadow-sm rounded-xl overflow-hidden">
        {/* Card Header */}
        <div className="p-6 border-b border-border bg-muted/20">
          <h2 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Palette className="size-5 text-primary" />
            Company Brand
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure your organization&apos;s visual identity for the customer portal and email templates.
          </p>
        </div>

        {/* Card Content Form */}
        <CardContent className="p-8 space-y-8">
          {/* 2-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Brand Name Input */}
              <div className="space-y-2">
                <Label htmlFor="brandName" className="text-sm font-medium">Brand Name</Label>
                <Input
                  id="brandName"
                  type="text"
                  placeholder="Apex Wellness Corp"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="h-11 px-4"
                  disabled={isSaving}
                />
              </div>

              {/* Secondary Color Input */}
              <div className="space-y-2">
                <Label htmlFor="secondaryColor" className="text-sm font-medium">Secondary Color</Label>
                <div className="flex items-center gap-3">
                  <div
                    className="relative w-12 h-12 rounded-lg border border-border shadow-inner cursor-pointer flex-shrink-0"
                    style={{ backgroundColor: secondaryColor }}
                  >
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => handleSecondaryColorChange(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      disabled={isSaving}
                    />
                  </div>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">#</span>
                    <Input
                      id="secondaryColor"
                      type="text"
                      className="h-11 pl-8 font-mono"
                      value={secondaryColor.replace("#", "")}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val.length <= 6) {
                          handleSecondaryColorChange("#" + val)
                        }
                      }}
                      disabled={isSaving}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Primary Color Input */}
              <div className="space-y-2">
                <Label htmlFor="primaryColor" className="text-sm font-medium">Primary Color</Label>
                <div className="flex items-center gap-3">
                  <div
                    className="relative w-12 h-12 rounded-lg border border-border shadow-inner cursor-pointer flex-shrink-0"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => handlePrimaryColorChange(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      disabled={isSaving}
                    />
                  </div>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">#</span>
                    <Input
                      id="primaryColor"
                      type="text"
                      className="h-11 pl-8 font-mono"
                      value={primaryColor.replace("#", "")}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val.length <= 6) {
                          handlePrimaryColorChange("#" + val)
                        }
                      }}
                      disabled={isSaving}
                    />
                  </div>
                </div>
              </div>

              {/* Font Style Picker */}
              <div className="space-y-2">
                <Label htmlFor="fontStyle" className="text-sm font-medium">Font Style</Label>
                <select
                  id="fontStyle"
                  value={fontStyle}
                  onChange={(e) => setFontStyle(e.target.value)}
                  className="w-full h-11 px-4 border border-input rounded-lg text-sm bg-background transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 appearance-none cursor-pointer"
                  disabled={isSaving}
                >
                  {FONT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Logo Section */}
          <div className="pt-6 border-t border-border">
            <Label className="block text-sm font-medium mb-4">Logo Design</Label>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-6 items-start">
              {/* Upload Zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={triggerFileInput}
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center min-h-[170px] text-center cursor-pointer transition-colors duration-200 group ${
                  dragActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary hover:bg-muted/30"
                } ${isSaving ? "pointer-events-none opacity-60" : ""}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".png,.jpg,.jpeg,.svg"
                  disabled={isSaving}
                />
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3 group-hover:scale-105 transition-transform">
                  <UploadCloud className="size-6" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {pendingLogoFile ? "Logo selected" : "Upload Logo"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, SVG or JPEG (Max. 2MB)
                </p>
              </div>

              {/* Preview Box */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Preview</p>
                <div 
                  className="aspect-square bg-card border border-border rounded-xl flex items-center justify-center p-4 overflow-hidden"
                  style={{
                    backgroundImage: "radial-gradient(var(--border) 1px, transparent 1px)",
                    backgroundSize: "12px 12px"
                  }}
                >
                  <div className="w-full h-full relative flex items-center justify-center">
                    {logoPreviewSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={logoPreviewKey}
                        src={logoPreviewSrc}
                        alt="Logo Preview"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center opacity-40 text-muted-foreground text-center">
                        <ImageIcon className="size-10 mb-2" />
                        <span className="text-xs font-medium">No Logo</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>

        {/* Footer Actions */}
        <div className="p-6 border-t border-border bg-muted/10 flex justify-center">
          <Button
            onClick={handleSaveBrand}
            disabled={isSaving}
            className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[200px] h-11 shadow-sm font-semibold flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="size-4" />
                Save Brand Settings
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Bottom Informational Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-5 bg-card border border-border rounded-xl flex items-start gap-4">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
            <Info className="size-4.5" />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mt-1">
            Changes may take up to 5 minutes to propagate to all regional servers.
          </p>
        </div>

        <div className="p-5 bg-card border border-border rounded-xl flex items-start gap-4">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
            <Eye className="size-4.5" />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mt-1">
            Preview how your brand looks on different device types before saving.
          </p>
        </div>

        <div className="p-5 bg-card border border-border rounded-xl flex items-start gap-4">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
            <Lock className="size-4.5" />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mt-1">
            All brand assets are stored in our secure, encrypted SOC2 compliant cloud.
          </p>
        </div>
      </div>
    </div>
  )
}

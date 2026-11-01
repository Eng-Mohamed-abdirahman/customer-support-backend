"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import "sonner/dist/styles.css"

export function Toaster(props: ToasterProps) {
  return <Sonner {...props} />
}
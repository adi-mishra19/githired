import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const DEFAULT_APP_URL = "https://githired-phi.vercel.app"

function normalizeUrl(url: string) {
  if (!url) {
    return undefined
  }

  const trimmed = url.trim()
  if (!trimmed) {
    return undefined
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  return withProtocol.replace(/\/+$/, "")
}

export function getAppBaseUrl() {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_BASE_URL,
    process.env.APP_URL,
    process.env.BASE_URL,
    process.env.NEXT_PUBLIC_VERCEL_URL,
    process.env.VERCEL_URL,
  ]

  for (const candidate of candidates) {
    const normalized = normalizeUrl(candidate ?? "")
    if (normalized) {
      return normalized
    }
  }

  return DEFAULT_APP_URL
}

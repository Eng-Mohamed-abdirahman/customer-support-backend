import { useQuery } from "@tanstack/react-query"
import { useSyncExternalStore } from "react"

import { listMyCompanyUsers } from "@/services/company.service"
import type { SafeUser } from "@/types/auth"

const USER_STORAGE_KEY = "user"

const subscribeToStorage = (onChange: () => void) => {
  window.addEventListener("storage", onChange)
  return () => window.removeEventListener("storage", onChange)
}

const readStoredUserRaw = () => {
  try {
    return localStorage.getItem(USER_STORAGE_KEY)
  } catch {
    return null
  }
}

const parseUser = (raw: string | null): SafeUser | null => {
  if (!raw) return null
  try {
    return JSON.parse(raw) as SafeUser
  } catch {
    return null
  }
}

export function useDashboardWelcome(loadCompany = true) {
  // The raw string is a stable snapshot; on the server there is no stored user.
  const rawUser = useSyncExternalStore(subscribeToStorage, readStoredUserRaw, () => null)
  const user = parseUser(rawUser)

  const companyQuery = useQuery({
    queryKey: ["my-company-name"],
    queryFn: async () => (await listMyCompanyUsers()).organization?.name ?? null,
    enabled: loadCompany && Boolean(user?.company),
    retry: false,
  })

  const firstName = user?.firstName || user?.fullName?.split(" ")[0] || "there"

  return {
    user,
    companyName: companyQuery.data ?? null,
    firstName,
    isLoading: companyQuery.isLoading,
  }
}

export default useDashboardWelcome

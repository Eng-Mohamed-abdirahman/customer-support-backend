import { useEffect, useState } from "react"

import { listMyCompanyUsers } from "@/services/company.service"
import type { SafeUser } from "@/types/auth"

type DashboardWelcomeState = {
  user: SafeUser | null
  companyName: string | null
  isLoading: boolean
}

export function useDashboardWelcome(loadCompany = true) {
  const [state, setState] = useState<DashboardWelcomeState>({
    user: null,
    companyName: null,
    isLoading: loadCompany,
  })

  useEffect(() => {
    let isMounted = true

    try {
      const raw = localStorage.getItem("user")
      const user = raw ? (JSON.parse(raw) as SafeUser) : null

      if (!isMounted) return

      if (!loadCompany) {
        setState({ user, companyName: null, isLoading: false })
        return
      }

      if (!user?.company) {
        setState({ user, companyName: null, isLoading: false })
        return
      }

      setState((prev) => ({ ...prev, user, isLoading: true }))

      listMyCompanyUsers()
        .then((result) => {
          if (!isMounted) return
          setState({
            user,
            companyName: result.organization?.name ?? null,
            isLoading: false,
          })
        })
        .catch(() => {
          if (!isMounted) return
          setState({ user, companyName: null, isLoading: false })
        })
    } catch {
      if (isMounted) {
        setState({ user: null, companyName: null, isLoading: false })
      }
    }

    return () => {
      isMounted = false
    }
  }, [loadCompany])

  const firstName = state.user?.firstName || state.user?.fullName?.split(" ")[0] || "there"

  return {
    user: state.user,
    companyName: state.companyName,
    firstName,
    isLoading: state.isLoading,
  }
}

export default useDashboardWelcome

import { useQuery } from "@tanstack/react-query"

import { fetchPlatformDashboardAnalytics } from "@/services/platformDashboardApi"
import type { PlatformDashboardData } from "@/types/platform-dashboard"

export function usePlatformDashboard() {
  const query = useQuery<PlatformDashboardData, Error>({
    queryKey: ["platform-dashboard"],
    queryFn: fetchPlatformDashboardAnalytics,
    refetchInterval: 30 * 1000,
    staleTime: 30 * 1000,
    retry: 2,
  })

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    isError: query.isError,
    refetch: query.refetch,
  }
}

export default usePlatformDashboard

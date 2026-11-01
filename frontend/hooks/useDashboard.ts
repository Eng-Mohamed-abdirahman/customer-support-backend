import { useQuery } from "@tanstack/react-query"
import { fetchDashboardAnalytics } from "@/services/dashboardApi"
import type { DashboardApiResponseData } from "@/types/dashboard"

export function useDashboard(range: string = "7d") {
  const query = useQuery<DashboardApiResponseData, Error>({
    queryKey: ["dashboard", range],
    queryFn: () => fetchDashboardAnalytics(range),
    refetchInterval: 30 * 1000, // Automatically refresh every 30 seconds
    staleTime: 30 * 1000,       // Mark data as stale after 30 seconds
    retry: 2,                   // Retry twice on failure before showing error state
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

export default useDashboard

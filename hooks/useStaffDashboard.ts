import { useQuery } from "@tanstack/react-query"

import { fetchStaffDashboardAnalytics } from "@/services/staffDashboardApi"
import type { StaffDashboardData } from "@/types/staff-dashboard"

export function useStaffDashboard() {
  const query = useQuery<StaffDashboardData, Error>({
    queryKey: ["staff-dashboard"],
    queryFn: fetchStaffDashboardAnalytics,
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

export default useStaffDashboard

"use client"

import { motion } from "framer-motion"
import { Users } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import type { StaffPerformanceData } from "@/components/dashboard/cards/types"
import { fadeInUp } from "@/components/dashboard/shared/animations"

interface StaffPerformanceChartProps {
  data?: StaffPerformanceData[]
  isLoading?: boolean
}

export function StaffPerformanceChart({ data = [], isLoading = false }: StaffPerformanceChartProps) {
  // Find the maximum resolved count to scale the progress bars
  const maxResolved = Math.max(...(data?.map((item) => item.resolved) ?? [1]), 1)

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-white shadow-sm h-full">
        <CardHeader>
          <Skeleton className="h-5 w-36 mb-1" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  const hasData = data && data.length > 0

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className="h-full"
    >
      <Card className="border-border/50 bg-white shadow-sm h-full flex flex-col justify-between">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-slate-800">
            Staff Performance
          </CardTitle>
          <CardDescription>Top agents by resolved tickets</CardDescription>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col justify-center gap-4 pb-6">
          {!hasData ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Users className="h-9 w-9 text-slate-300 mb-3" />
              <h3 className="font-semibold text-sm text-slate-700">No staff data</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                Agent performance will appear once tickets are assigned and resolved.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.map((item) => {
                const percentage = (item.resolved / maxResolved) * 100

                return (
                  <div key={item.name} className="flex items-center gap-3">
                    {/* User Avatar */}
                    <Avatar className="h-8 w-8 border border-border/60">
                      <AvatarFallback className="bg-teal-50 text-primary text-xs font-bold">
                        {item.avatar}
                      </AvatarFallback>
                    </Avatar>

                    {/* Name + Progress bar */}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-700">{item.name}</span>
                        <span className="text-slate-800 tabular-nums">{item.resolved} Res.</span>
                      </div>

                      {/* Custom progress bar */}
                      <div className="h-2 w-full rounded-full bg-slate-50 border border-slate-100">
                        <div
                          className="h-2 rounded-full bg-[#12304A]"
                          style={{
                            width: `${percentage}%`,
                            transition: "width 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default StaffPerformanceChart

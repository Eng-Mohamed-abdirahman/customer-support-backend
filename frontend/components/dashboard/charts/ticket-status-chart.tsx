"use client"

import { motion } from "framer-motion"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { fadeInUp } from "@/components/dashboard/shared/animations"
import type { TicketStatusData } from "@/components/dashboard/cards/types"
import { TicketX } from "lucide-react"

interface TicketStatusChartProps {
  data?: TicketStatusData[]
  isLoading?: boolean
}

export function TicketStatusChart({ data = [], isLoading = false }: TicketStatusChartProps) {
  if (isLoading) {
    return (
      <Card className="border-border/50 bg-white shadow-sm">
        <CardHeader>
          <Skeleton className="h-5 w-28 mb-1" />
          <Skeleton className="h-4 w-44" />
        </CardHeader>
        <CardContent className="space-y-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
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
    >
      <Card className="border-border/50 bg-white shadow-sm h-full">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800">Ticket Status</CardTitle>
          <CardDescription>Current ticket distribution</CardDescription>
        </CardHeader>
        <CardContent>
          {!hasData ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <TicketX className="h-9 w-9 text-slate-300 mb-3" />
              <h3 className="font-semibold text-sm text-slate-700">No ticket data</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                Ticket metrics will appear once support requests are created.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {data.map((item) => {
                const percentage = item.total > 0
                  ? (item.value / item.total) * 100
                  : 0

                return (
                  <div key={item.label} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        {item.label}
                      </span>
                      <span className="text-sm font-semibold tabular-nums">
                        {item.value}{" "}
                        <span className="text-muted-foreground font-normal">
                          / {item.total}
                        </span>
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted/50">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          backgroundColor: item.color,
                          width: `${percentage}%`,
                          transition: "width 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                        }}
                      />
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

export default TicketStatusChart

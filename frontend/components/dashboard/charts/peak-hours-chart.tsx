"use client"

import { motion } from "framer-motion"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { fadeInUp } from "@/components/dashboard/shared/animations"
import { Clock } from "lucide-react"

interface PeakHoursChartProps {
  data?: number[]
  isLoading?: boolean
}

export function PeakHoursChart({ data = [], isLoading = false }: PeakHoursChartProps) {
  const maxValue = data.length > 0 ? Math.max(...data, 1) : 1
  const hasData = data && data.length > 0

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-white shadow-sm h-full">
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-44" />
        </CardHeader>
        <CardContent className="pt-4 pb-6 px-4">
          <div className="flex items-end justify-between h-[120px] w-full gap-1.5">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="flex-1 rounded-sm" style={{ height: `${30 + Math.random() * 70}%` }} />
            ))}
          </div>
          <div className="flex justify-between w-full mt-3">
            {["08:00", "12:00", "16:00", "20:00"].map((label) => (
              <Skeleton key={label} className="h-3 w-10" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className="h-full"
    >
      <Card className="border-border/50 bg-white shadow-sm h-full flex flex-col justify-between">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Peak Hours (8 AM – 8 PM)
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col flex-1 justify-end pt-4 pb-6 px-4">
          {!hasData ? (
            <div className="flex flex-col items-center justify-center h-[140px] text-center">
              <Clock className="h-9 w-9 text-slate-300 mb-3" />
              <p className="text-xs text-slate-400">No hourly data for this period</p>
            </div>
          ) : (
            <>
              {/* Vertical Bar Chart Container */}
              <div className="flex items-end justify-between h-[120px] w-full gap-1.5 md:gap-2">
                {data.map((value, idx) => {
                  const heightPercent = (value / maxValue) * 100
                  const isPeak = value > maxValue * 0.75
                  const barColorClass = isPeak
                    ? "bg-primary hover:bg-primary/95"
                    : "bg-primary/30 hover:bg-primary/45"

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                      {/* Bar Tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute bottom-full mb-1 bg-slate-800 text-white text-[10px] rounded px-1.5 py-0.5 pointer-events-none z-10 font-mono whitespace-nowrap">
                        {value} conv.
                      </div>
                      {/* The Bar */}
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${heightPercent}%` }}
                        transition={{ duration: 0.8, delay: idx * 0.05, ease: "easeOut" }}
                        className={`w-full rounded-sm transition-colors duration-200 ${barColorClass}`}
                      />
                    </div>
                  )
                })}
              </div>

              {/* X Axis Labels */}
              <div className="flex justify-between w-full mt-3 text-[10px] font-bold text-muted-foreground tracking-wider uppercase">
                <span>08:00</span>
                <span>12:00</span>
                <span>16:00</span>
                <span>20:00</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default PeakHoursChart

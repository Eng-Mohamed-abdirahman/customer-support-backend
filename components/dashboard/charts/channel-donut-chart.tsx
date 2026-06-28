"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { fadeInUp } from "@/components/dashboard/shared/animations"
import type { ChannelData } from "@/components/dashboard/cards/types"
import { PieChart as PieIcon } from "lucide-react"

interface ChannelDonutChartProps {
  data?: ChannelData[]
  isLoading?: boolean
}

interface TooltipEntry {
  payload?: ChannelData
  color?: string
}

interface CustomTooltipProps {
  active?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: TooltipEntry[]
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null

  const entry = payload[0]
  const item = entry?.payload
  if (!item) return null

  return (
    <div className="rounded-lg border border-border/60 bg-card px-3 py-2 shadow-lg">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
        <span className="text-sm font-medium text-foreground">{item.name}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{item.value} conversations</p>
    </div>
  )
}

export function ChannelDonutChart({ data = [], isLoading = false }: ChannelDonutChartProps) {
  const total = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data])
  const hasData = data && data.length > 0 && total > 0

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <Skeleton className="h-5 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <Skeleton className="h-[200px] w-[200px] rounded-full" />
          <div className="grid w-full grid-cols-2 gap-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="h-full">
      <Card className="h-full border-border/50 bg-white shadow-sm flex flex-col justify-between">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800">Channels</CardTitle>
          <CardDescription>Conversation distribution by source</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col items-center justify-center flex-1 gap-6 pb-6">
          {!hasData ? (
            <div className="flex flex-col items-center justify-center py-12 text-center h-[280px]">
              <PieIcon className="h-10 w-10 text-slate-300 mb-3" />
              <h3 className="font-semibold text-sm text-slate-700">No channel distribution</h3>
              <p className="text-xs text-slate-400 max-w-[200px] mt-1">
                Channel usage reports will show up here once messages start arriving.
              </p>
            </div>
          ) : (
            <>
              {/* ---------- Donut Chart ---------- */}
              <div className="w-full relative flex items-center justify-center" style={{ height: 200 }}>
                {/* Custom SVG center text positioned absolutely in the middle */}
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-slate-900 leading-none">
                    {total.toLocaleString()}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Total
                  </span>
                </div>

                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {data.map((item) => (
                        <Cell key={item.name} fill={item.color} className="outline-none focus:outline-none" />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} cursor={false} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* ---------- Legend (2×2 grid) ---------- */}
              <div className="grid w-full grid-cols-2 gap-x-6 gap-y-2.5">
                {data.map((item) => {
                  const percentage = total > 0 ? ((item.value / total) * 100).toFixed(0) : "0"

                  return (
                    <div key={item.name} className="flex items-center gap-2 text-xs font-semibold">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="truncate text-slate-500">{item.name}</span>
                      <span className="ml-auto text-slate-800 font-bold">{percentage}%</span>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default ChannelDonutChart

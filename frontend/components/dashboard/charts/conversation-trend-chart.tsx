"use client"

import { motion } from "framer-motion"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { fadeInUp } from "@/components/dashboard/shared/animations"
import type { ConversationTrendData } from "@/components/dashboard/cards/types"
import { BarChart3 } from "lucide-react"

interface ConversationTrendChartProps {
  data?: ConversationTrendData[]
  isLoading?: boolean
}

interface TooltipEntry {
  dataKey?: string
  name?: string
  value?: number | string
  color?: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg border border-border bg-white px-4 py-3 shadow-md">
      <p className="mb-1.5 text-sm font-medium text-foreground">{label}</p>
      {payload.map((entry, i) => (
        <div key={entry.dataKey ?? i} className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
          <span className="capitalize">{entry.name}</span>
          <span className="ml-auto font-semibold text-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

export function ConversationTrendChart({ data = [], isLoading = false }: ConversationTrendChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[320px] w-full rounded-lg" />
        </CardContent>
      </Card>
    )
  }

  const hasData = data && data.length > 0

  return (
    <motion.div variants={fadeInUp} initial="hidden" animate="visible">
      <Card className="border-border/50 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800">Conversation Trend</CardTitle>
          <CardDescription>AI vs Human resolution distribution</CardDescription>
        </CardHeader>

        <CardContent className="min-h-[320px] flex flex-col justify-center">
          {!hasData ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BarChart3 className="h-10 w-10 text-slate-300 mb-3" />
              <h3 className="font-semibold text-sm text-slate-700">No trend data</h3>
              <p className="text-xs text-slate-400 max-w-[240px] mt-1">
                There are no conversations recorded within this date range.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.15} />

                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  dy={8}
                />

                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  width={36}
                />

                <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--color-muted)", opacity: 0.3 }} />

                <Bar dataKey="ai" name="AI Handled" fill="#13B8A6" radius={[4, 4, 0, 0]} maxBarSize={30} />
                <Bar dataKey="human" name="Human Handled" fill="#12304A" radius={[4, 4, 0, 0]} maxBarSize={30} />
                
                <Legend 
                  verticalAlign="bottom" 
                  iconType="circle" 
                  iconSize={8}
                  wrapperStyle={{ paddingTop: 16, fontSize: 11, fontWeight: 500 }} 
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default ConversationTrendChart

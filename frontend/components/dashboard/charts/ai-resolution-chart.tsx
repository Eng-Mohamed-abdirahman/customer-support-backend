"use client"

import { motion } from "framer-motion"
import { Cpu, User } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { fadeInUp } from "@/components/dashboard/shared/animations"

interface AiResolutionChartProps {
  rate?: number
  aiCount?: number
  humanCount?: number
  isLoading?: boolean
}

export function AiResolutionChart({
  rate = 0,
  aiCount = 0,
  humanCount = 0,
  isLoading = false,
}: AiResolutionChartProps) {
  if (isLoading) {
    return (
      <Card className="border-border/50 bg-white shadow-sm h-full">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-44 mb-1" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6 pb-6">
          <Skeleton className="h-[200px] w-[200px] rounded-3xl" />
          <div className="grid grid-cols-2 gap-4 w-full">
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
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
          <CardTitle className="text-lg font-semibold text-foreground">AI vs Human Resolution</CardTitle>
          <CardDescription>Performance ratio between automated and human care</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col items-center justify-center flex-1 gap-6 pb-6">
          {/* Main Visual Display Box */}
          <div className="relative w-full max-w-[240px] aspect-square rounded-3xl border-[3px] border-primary bg-teal-50 flex flex-col items-center justify-center shadow-inner overflow-hidden">
            {/* Green top flag/banner */}
            <div className="absolute top-0 inset-x-0 h-4 bg-emerald-500 flex items-center justify-center">
              <span className="text-[9px] font-bold text-white uppercase tracking-widest">Optimized</span>
            </div>

            {/* Center Value */}
            <div className="text-center mt-2">
              <span className="text-6xl font-black tracking-tight text-primary">
                {rate}%
              </span>
              <p className="text-xs font-bold text-primary/80 uppercase tracking-widest mt-1">
                AI Lead
              </p>
            </div>

            {/* Subtle tech background circle lines */}
            <div className="absolute inset-4 rounded-full border border-primary/10 pointer-events-none animate-pulse" />
            <div className="absolute inset-8 rounded-full border border-dashed border-primary/20 pointer-events-none" />
          </div>

          {/* Metric Comparison Boxes */}
          <div className="grid grid-cols-2 gap-4 w-full">
            {/* AI Agent box */}
            <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 p-3 text-center">
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider mb-1">
                <Cpu className="h-3.5 w-3.5" />
                AI Agent
              </div>
              <span className="text-2xl font-bold text-slate-800">{aiCount.toLocaleString()}</span>
            </div>

            {/* Human Agent box */}
            <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 p-3 text-center">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
                <User className="h-3.5 w-3.5" />
                Human
              </div>
              <span className="text-2xl font-bold text-slate-800">{humanCount.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default AiResolutionChart

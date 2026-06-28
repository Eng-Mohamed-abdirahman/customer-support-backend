"use client"

import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, Minus, MessageSquareText, Clock, BrainCircuit, Users } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { fadeInUp, cardHover } from "@/components/dashboard/shared/animations"
import type { KpiCardData } from "@/components/dashboard/cards/types"

interface KpiCardProps {
  data?: KpiCardData
  index: number
  isLoading?: boolean
}

const trendConfig = {
  up: {
    icon: TrendingUp,
    className: "text-emerald-600 bg-emerald-50 border border-emerald-100",
  },
  down: {
    icon: TrendingDown,
    className: "text-emerald-600 bg-emerald-50 border border-emerald-100",
  },
  neutral: {
    icon: Minus,
    className: "text-gray-500 bg-gray-100 border border-gray-200",
  },
} as const

export function KpiCard({ data, index, isLoading = false }: KpiCardProps) {
  if (isLoading || !data) {
    return (
      <Card className="border-border/50 bg-white shadow-sm h-[170px] flex flex-col justify-between pt-6 pb-6 px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-4 w-full" />
      </Card>
    )
  }

  const { id, title, value, description, trend, progress, icon: Icon, iconColor, iconBg } = data
  const isResponseTime = id === "response-time"
  const TrendIcon = isResponseTime ? TrendingDown : (trendConfig[trend.direction]?.icon || Minus)
  const trendClassName = isResponseTime 
    ? "text-emerald-600 bg-emerald-50 border border-emerald-100" 
    : (trendConfig[trend.direction]?.className || "text-gray-500 bg-gray-100")

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      transition={{ delay: index * 0.1 }}
      whileHover={cardHover}
    >
      <Card className="border-border/50 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardContent className="flex flex-col gap-4 pt-6 h-[170px] justify-between">
          {/* Header: Icon + Title */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBg}`}
              >
                <Icon className={`h-4.5 w-4.5 ${iconColor}`} />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {title}
              </span>
            </div>

            {/* Trend Badge or Live Indicator */}
            {id === "staff-online" ? (
              <div className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </div>
            ) : (
              <div
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${trendClassName}`}
              >
                <TrendIcon className="h-3 w-3" />
                <span>{trend.value}</span>
              </div>
            )}
          </div>

          {/* Metric Value */}
          <div className="space-y-0.5">
            <p className="text-3xl font-extrabold tracking-tight text-slate-900 leading-none">
              {value}
            </p>
          </div>

          {/* Card Conditional Bottom Section */}
          <div className="h-10 flex flex-col justify-end">
            {id === "conversations" && (
              <div className="flex items-center gap-4 text-xs font-medium">
                <div className="flex items-center gap-1">
                  <span className="text-emerald-600 font-bold">Resolved:</span>
                  <span className="text-slate-800 font-bold">
                    {description.match(/Resolved:\s*(\d+)/)?.[1] ?? "298"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-slate-500">Open:</span>
                  <span className="text-slate-800 font-bold">
                    {description.match(/Open:\s*(\d+)/)?.[1] ?? "58"}
                  </span>
                </div>
              </div>
            )}

            {id === "response-time" && (
              <div className="space-y-1.5 w-full">
                <div className="h-2 w-full rounded-full bg-emerald-50">
                  <div 
                    className="h-2 rounded-full bg-emerald-500" 
                    style={{ width: `${progress}%` }} 
                  />
                </div>
              </div>
            )}

            {id === "ai-resolution" && (
              <p className="text-xs text-slate-500 font-medium leading-normal">
                {description}
              </p>
            )}

            {id === "staff-online" && (
              <div className="flex items-center">
                <div className="flex -space-x-2 overflow-hidden">
                  <Avatar className="inline-block h-6.5 w-6.5 rounded-full border border-white">
                    <AvatarFallback className="bg-sky-100 text-sky-700 text-[10px] font-bold">AH</AvatarFallback>
                  </Avatar>
                  <Avatar className="inline-block h-6.5 w-6.5 rounded-full border border-white">
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 text-[10px] font-bold">MH</AvatarFallback>
                  </Avatar>
                  <Avatar className="inline-block h-6.5 w-6.5 rounded-full border border-white">
                    <AvatarFallback className="bg-violet-100 text-violet-700 text-[10px] font-bold">AL</AvatarFallback>
                  </Avatar>
                  <div className="inline-flex h-6.5 w-6.5 items-center justify-center rounded-full border border-white bg-slate-100 text-[9px] font-bold text-slate-600">
                    +{Math.max(0, parseInt(value) - 3) || 15}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default KpiCard

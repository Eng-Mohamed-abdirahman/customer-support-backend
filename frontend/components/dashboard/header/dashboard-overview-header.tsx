"use client"

import { type ReactNode } from "react"
import { motion } from "framer-motion"
import { Calendar, RefreshCw, Download, ChevronDown, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { fadeIn } from "@/components/dashboard/shared/animations"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface DashboardOverviewHeaderProps {
  title: string
  subtitle?: ReactNode
  range?: string
  onRangeChange?: (range: string) => void
  isFetching?: boolean
  onRefresh?: () => void
  showRangePicker?: boolean
}

const rangeLabels: Record<string, string> = {
  today: "Today",
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  "90d": "Last 90 Days",
}

export function DashboardOverviewHeader({
  title,
  subtitle,
  range = "7d",
  onRangeChange,
  isFetching = false,
  onRefresh,
  showRangePicker = true,
}: DashboardOverviewHeaderProps) {
  return (
    <motion.div
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      className="w-full"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-[28px] leading-9 font-bold text-navy-800 sm:text-[32px] sm:leading-10">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>

        <div className="flex items-center gap-2">
          {onRefresh ? (
            <Button
              variant="outline"
              size="icon"
              onClick={onRefresh}
              disabled={isFetching}
              className="h-9 w-9 rounded-lg border-border/80 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
            >
              {isFetching ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          ) : null}

          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-lg border-border/80 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
          </Button>

          {showRangePicker && onRangeChange ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 gap-2 rounded-lg border-border/80 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  <Calendar className="h-4 w-4 text-slate-500" />
                  {rangeLabels[range] || "Select Range"}
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-[180px] rounded-xl border border-border bg-white shadow-md"
              >
                <DropdownMenuItem
                  onClick={() => onRangeChange("today")}
                  className="cursor-pointer py-2 text-xs font-semibold hover:bg-slate-50"
                >
                  Today
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onRangeChange("7d")}
                  className="cursor-pointer py-2 text-xs font-semibold hover:bg-slate-50"
                >
                  Last 7 Days
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onRangeChange("30d")}
                  className="cursor-pointer py-2 text-xs font-semibold hover:bg-slate-50"
                >
                  Last 30 Days
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onRangeChange("90d")}
                  className="cursor-pointer py-2 text-xs font-semibold hover:bg-slate-50"
                >
                  Last 90 Days
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
    </motion.div>
  )
}

export default DashboardOverviewHeader

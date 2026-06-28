"use client"

import { motion } from "framer-motion"
import { Calendar, Plus, Bell, Clock, RefreshCw, Download, ChevronDown, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { fadeIn } from "@/components/dashboard/shared/animations"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useState } from "react"

interface DashboardOverviewHeaderProps {
  range: string
  onRangeChange: (range: string) => void
  isFetching?: boolean
  onRefresh?: () => void
  tenantName?: string
}

const rangeLabels: Record<string, string> = {
  today: "Today",
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  "90d": "Last 90 Days",
}

export function DashboardOverviewHeader({
  range,
  onRangeChange,
  isFetching = false,
  onRefresh,
  tenantName = "Apple Inc.",
}: DashboardOverviewHeaderProps) {
  return (
    <motion.div
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      className="space-y-6 w-full"
    >
      {/* Top Header Navigation Strip */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4">
        {/* Date and Tenant Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Picker Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 gap-2 border-border/80 text-xs font-semibold px-3 text-slate-700 bg-white shadow-sm rounded-lg hover:bg-slate-50">
                <Calendar className="h-4 w-4 text-slate-500" />
                {rangeLabels[range] || "Select Range"}
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[180px] bg-white border border-border shadow-md rounded-xl">
              <DropdownMenuItem onClick={() => onRangeChange("today")} className="text-xs font-semibold cursor-pointer py-2 hover:bg-slate-50">
                Today
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRangeChange("7d")} className="text-xs font-semibold cursor-pointer py-2 hover:bg-slate-50">
                Last 7 Days
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRangeChange("30d")} className="text-xs font-semibold cursor-pointer py-2 hover:bg-slate-50">
                Last 30 Days
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRangeChange("90d")} className="text-xs font-semibold cursor-pointer py-2 hover:bg-slate-50">
                Last 90 Days
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Tenant Selector Dropdown */}
          <div className="flex items-center text-xs font-bold text-slate-400 tracking-wider uppercase pl-1">
            Tenant:
            <Button variant="ghost" disabled className="h-9 gap-2 text-xs font-bold text-slate-800 ml-1.5 px-3 bg-white border border-border/80 shadow-sm rounded-lg opacity-85">
              <div className="h-4 w-4 bg-slate-900 rounded-full flex items-center justify-center text-[10px] text-white font-extrabold">
                
              </div>
              {tenantName}
            </Button>
          </div>
        </div>

        {/* Action Button & Utilities */}
        <div className="flex items-center gap-3">
          {/* + New Ticket Button */}
          <Button className="h-9 gap-1.5 text-xs font-bold bg-[#023e8a] hover:bg-[#0096c7] text-white rounded-lg shadow px-4 transition-colors">
            <Plus className="h-4 w-4" />
            New Ticket
          </Button>

          {/* Notification Bell */}
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 relative">
            <Bell className="h-4 w-4" />
            <span className="absolute top-2 right-2.5 h-1.5 w-1.5 rounded-full bg-rose-500" />
          </Button>

          {/* Clock History */}
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100">
            <Clock className="h-4 w-4" />
          </Button>

          {/* User Initials Avatar */}
          <div className="h-8 w-8 rounded-full bg-[#023e8a]/10 border border-[#023e8a]/20 flex items-center justify-center text-xs font-bold text-[#023e8a]">
            JD
          </div>
        </div>
      </div>

      {/* Title & Description & Sub-actions */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between pt-1">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Command Center
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time performance metrics for <span className="font-semibold text-slate-700">{tenantName}</span> Global Support.
          </p>
        </div>

        {/* Action buttons on the right of title */}
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={onRefresh}
            disabled={isFetching}
            className="h-9 w-9 border-border/80 bg-white text-slate-600 hover:bg-slate-50 shadow-sm rounded-lg"
          >
            {isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9 border-border/80 bg-white text-slate-600 hover:bg-slate-50 shadow-sm rounded-lg">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

export default DashboardOverviewHeader

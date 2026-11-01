"use client"

import { type ComponentType, useMemo } from "react"
import Link from "next/link"
import {
  BellRing,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  MessageSquareMore,
  Star,
  TimerReset,
  TrendingDown,
  TrendingUp,
} from "lucide-react"

import { DashboardOverviewHeader } from "@/components/dashboard/header/dashboard-overview-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { usePlatformDashboard } from "@/hooks/usePlatformDashboard"
import { useDashboardWelcome } from "@/hooks/useDashboardWelcome"

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

type MiniStat = {
  title: string
  value: string
  tone: "default" | "indigo" | "emerald" | "amber" | "rose"
  icon: ComponentType<{ className?: string }>
  badge?: string
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase() || "TN"
}

function formatWaitTime(minutes: number) {
  if (minutes < 1) return "Under 1 min"
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

function statusBadgeClass(status: string) {
  const normalized = status.toLowerCase()
  if (normalized === "open" || normalized === "urgent") {
    return "bg-rose-50 text-rose-700 border-rose-200"
  }
  if (normalized === "pending" || normalized === "waiting") {
    return "bg-amber-50 text-amber-700 border-amber-200"
  }
  if (normalized === "closed" || normalized === "resolved") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200"
  }
  return "bg-slate-50 text-slate-700 border-slate-200"
}

function statusLabel(status: string) {
  const normalized = status.toLowerCase()
  if (normalized === "open") return "URGENT"
  if (normalized === "pending") return "WAITING"
  if (normalized === "closed") return "RESOLVED"
  return normalized.toUpperCase()
}

export function PlatformAdminDashboard() {
  const { data, isLoading, isFetching, refetch } = usePlatformDashboard()
  const { firstName } = useDashboardWelcome(false)

  const resolvedWeekly = useMemo(() => data?.charts.resolvedWeekly ?? [], [data])
  const responseRowsData = useMemo(() => data?.charts.responseRows ?? [], [data])
  const priorityAssignments = data?.priorityAssignments ?? []
  const leaderboard = data?.leaderboard ?? []
  const liveUpdates = data?.liveUpdates ?? []
  const schedule = data?.schedule
  const notes = data?.notes ?? []

  const urgentChats = data?.summary.urgentChats ?? 0
  const assigned = data?.summary.assigned ?? 0
  const open = data?.summary.open ?? 0
  const resolved = data?.summary.resolved ?? 0
  const followUp = data?.summary.followUp ?? 0
  const avgReply = data?.summary.avgReplyFormatted ?? "0s"
  const rating = data?.summary.rating ?? 0

  const miniStats: MiniStat[] = [
    {
      title: "Active Tenants",
      value: String(assigned),
      tone: "indigo",
      icon: Building2,
      badge: data?.summary.trialingOrganizations ? `+${data.summary.trialingOrganizations} trial` : undefined,
    },
    { title: "Open", value: String(open), tone: "rose", icon: BellRing },
    { title: "Resolved", value: String(resolved), tone: "emerald", icon: CheckCircle2 },
    { title: "Avg. Reply", value: avgReply, tone: "amber", icon: Clock3 },
    { title: "Rating", value: rating > 0 ? `${rating.toFixed(1)}/5` : "0/5", tone: "default", icon: Star },
    { title: "Follow-up", value: String(followUp), tone: "default", icon: TimerReset },
  ]

  const todayIndex = new Date().getDay()
  const chartTodayIndex = todayIndex === 0 ? 6 : todayIndex - 1

  const resolvedBars = useMemo(() => {
    const values = resolvedWeekly.slice(0, 7).map((item) => Math.max(item.total, 0))
    const padded = Array.from({ length: 7 }).map((_, idx) => values[idx] ?? 0)
    const max = Math.max(...padded, 1)

    return padded.map((value, index) => ({
      day: weekdays[index],
      value,
      height: Math.max(12, Math.round((value / max) * 120)),
      isToday: index === chartTodayIndex,
    }))
  }, [resolvedWeekly, chartTodayIndex])

  const responseRows = useMemo(() => {
    const values = responseRowsData.slice(0, 4).map((item) => item.minutes)
    const padded = Array.from({ length: 4 }).map((_, idx) => values[idx] ?? 0)
    const max = Math.max(...padded, 1)
    return padded.map((value, idx) => ({
      day: weekdays[idx],
      width: `${Math.max(20, Math.round((value / max) * 100))}%`,
      label: `${Math.max(1, Math.round(value))}m`,
    }))
  }, [responseRowsData])

  const avgResponseLabel = useMemo(() => {
    if (responseRowsData.length === 0) return "0m"
    const avg =
      responseRowsData.reduce((sum, row) => sum + row.minutes, 0) / responseRowsData.length
    return `${avg.toFixed(1)}m`
  }, [responseRowsData])

  const topTeam = [...leaderboard].sort((a, b) => b.resolved - a.resolved).slice(0, 3)

  return (
    <div className="space-y-6 pb-10">
      <DashboardOverviewHeader
        title={`Welcome back, ${firstName}.`}
        subtitle={
          <>
            You have{" "}
            <span className="font-semibold text-slate-700">{urgentChats} urgent items</span> needing
            attention across the platform.
          </>
        }
        isFetching={isFetching}
        onRefresh={refetch}
        showRangePicker={false}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {miniStats.map((item) => (
          <Card key={item.title} className="border-border/70 shadow-sm">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "inline-flex size-9 items-center justify-center rounded-lg",
                    item.tone === "indigo" && "bg-indigo-100 text-indigo-700",
                    item.tone === "emerald" && "bg-emerald-100 text-emerald-700",
                    item.tone === "amber" && "bg-amber-100 text-amber-700",
                    item.tone === "rose" && "bg-rose-100 text-rose-700",
                    item.tone === "default" && "bg-slate-100 text-slate-700"
                  )}
                >
                  <item.icon className="size-4" />
                </span>
                {item.badge ? (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    {item.badge}
                  </span>
                ) : isFetching ? (
                  <span className="text-[10px] text-muted-foreground">updating...</span>
                ) : null}
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {item.title}
                </p>
                <p className="mt-1 text-3xl font-semibold leading-none text-foreground">
                  {isLoading ? "--" : item.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_1.2fr_1fr]">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">Resolved Weekly</CardTitle>
              <CardDescription>Platform-wide closures</CardDescription>
            </div>
            <span className="rounded-md border border-border/70 px-2 py-1 text-[10px] font-semibold text-muted-foreground">
              Current Week
            </span>
          </CardHeader>
          <CardContent>
            <div className="flex h-36 items-end gap-2">
              {resolvedBars.map((bar) => (
                <div key={bar.day} className="flex-1 space-y-2 text-center">
                  <div
                    className={cn(
                      "mx-auto w-full rounded-md transition-colors",
                      bar.isToday ? "bg-[#0E7C70]" : "bg-indigo-100"
                    )}
                    style={{ height: `${bar.height}px` }}
                  />
                  <p
                    className={cn(
                      "text-[10px] font-medium",
                      bar.isToday ? "text-[#0E7C70] font-bold" : "text-muted-foreground"
                    )}
                  >
                    {bar.day}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">Response Time</CardTitle>
              <CardDescription>Average handling speed</CardDescription>
            </div>
            <span className="text-xs font-semibold text-emerald-700">Avg: {avgResponseLabel}</span>
          </CardHeader>
          <CardContent className="space-y-3">
            {responseRows.map((row) => (
              <div key={row.day} className="grid grid-cols-[48px_1fr_40px] items-center gap-3">
                <p className="text-xs font-medium text-muted-foreground">{row.day}</p>
                <div className="h-2.5 rounded-full bg-muted">
                  <div className="h-2.5 rounded-full bg-emerald-600" style={{ width: row.width }} />
                </div>
                <p className="text-xs font-semibold text-foreground">{row.label}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Service Rating</CardTitle>
            <CardDescription>Based on recent reviews</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center gap-3">
            <div
              className="relative grid size-36 place-items-center rounded-full"
              style={{
                background: `conic-gradient(#0E7C70 ${Math.max(0, Math.min(100, (rating / 5) * 100))}%, #e5e7eb 0%)`,
              }}
            >
              <div className="grid size-28 place-items-center rounded-full bg-background text-center">
                <p className="text-3xl font-bold text-foreground">{rating > 0 ? rating.toFixed(1) : "0.0"}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {rating >= 4.5 ? "Excellent" : rating >= 3.5 ? "Good" : "Fair"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "size-3.5",
                    i < Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-slate-300"
                  )}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Based on platform customer feedback</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Priority Assignments</CardTitle>
              <CardDescription>Cross-tenant tickets needing attention</CardDescription>
            </div>
            <Button asChild variant="ghost" className="text-[#0E7C70]">
              <Link href="/dashboard/organizations">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="mb-2 grid grid-cols-[1.8fr_120px_110px_70px] gap-2 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <span>Customer</span>
              <span>Status</span>
              <span>Wait Time</span>
              <span className="text-right">Action</span>
            </div>
            <div className="space-y-2">
              {priorityAssignments.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[1.8fr_120px_110px_70px] items-center gap-2 rounded-xl border border-border/70 px-3 py-3 hover:bg-muted/30"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                      {getInitials(item.customerName)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{item.customerName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.subject} · {item.organizationName}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "inline-flex w-fit rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wide",
                      statusBadgeClass(item.status)
                    )}
                  >
                    {statusLabel(item.status)}
                  </span>
                  <p className="text-xs font-medium text-muted-foreground">
                    {formatWaitTime(item.waitTimeMinutes)}
                  </p>
                  <div className="ml-auto flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      className="inline-flex size-8 items-center justify-center rounded-lg border border-border/70 text-muted-foreground hover:bg-muted"
                    >
                      <MessageSquareMore className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      className="inline-flex size-8 items-center justify-center rounded-lg border border-[#0E7C70]/30 bg-[#0E7C70]/10 text-[#0E7C70]"
                    >
                      <Eye className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {priorityAssignments.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No priority assignments right now.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tenant Leaderboard</CardTitle>
              <CardDescription>Top organizations this period</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {topTeam.map((member, idx) => (
                <div
                  key={`${member.name}-${idx}`}
                  className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                      {getInitials(member.name)}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.successRate}% success</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {idx === 0 ? (
                      <TrendingUp className="size-4 text-emerald-600" />
                    ) : idx === 1 ? (
                      <TrendingUp className="size-4 text-emerald-500" />
                    ) : (
                      <TrendingDown className="size-4 text-rose-500" />
                    )}
                    <p className="text-xs font-bold text-[#0E7C70]">#{member.rank || idx + 1}</p>
                  </div>
                </div>
              ))}
              {topTeam.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tenant performance data yet.</p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-violet-50/40 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Live Updates</CardTitle>
              <CardDescription>Recent platform activity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {liveUpdates.map((update, index) => (
                <div key={`${update.text}-${index}`} className="flex gap-3">
                  <span
                    className={cn(
                      "mt-1.5 size-2 shrink-0 rounded-full",
                      index === 0 ? "bg-[#0E7C70]" : "bg-slate-300"
                    )}
                  />
                  <div>
                    <p className={cn("text-sm", index === 0 ? "font-medium text-foreground" : "text-muted-foreground")}>
                      {update.text}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{update.time}</p>
                  </div>
                </div>
              ))}
              {liveUpdates.length === 0 ? (
                <p className="text-sm text-muted-foreground">No new updates yet.</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <Card className="border-border/70 shadow-sm">
          <CardContent className="flex items-center gap-4 p-6">
            <span className="inline-flex size-12 items-center justify-center rounded-xl bg-[#0E7C70] text-white">
              <CalendarDays className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Today&apos;s Ops Window
              </p>
              <p className="text-2xl font-bold text-foreground">
                {schedule?.shiftStart ?? "09:00"} — {schedule?.shiftEnd ?? "17:00"}
              </p>
              <p className="text-xs text-emerald-700">
                Ending in {Math.max(0, Math.floor((schedule?.remainingShiftMinutes ?? 0) / 60))}h{" "}
                {(schedule?.remainingShiftMinutes ?? 0) % 60}m
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Notes</CardTitle>
            <CardDescription>Platform reminders</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {notes.map((note, index) => (
              <div
                key={`${note}-${index}`}
                className="rounded-lg border-l-2 border-[#0E7C70] bg-muted/40 px-3 py-2.5 text-sm text-foreground"
              >
                {note}
              </div>
            ))}
            {notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notes for now.</p>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

export default PlatformAdminDashboard

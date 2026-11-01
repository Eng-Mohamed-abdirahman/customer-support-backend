"use client"

import { type ComponentType, useMemo } from "react"
import {
  BellRing,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MessageSquareMore,
  Star,
  Ticket,
  TimerReset,
} from "lucide-react"

import { DashboardOverviewHeader } from "@/components/dashboard/header/dashboard-overview-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useStaffDashboard } from "@/hooks/useStaffDashboard"
import { useDashboardWelcome } from "@/hooks/useDashboardWelcome"

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

type MiniStat = {
  title: string
  value: string
  tone: "default" | "indigo" | "emerald" | "amber" | "rose"
  icon: ComponentType<{ className?: string }>
}

export function StaffDashboard() {
  const { data, isLoading, isFetching, refetch } = useStaffDashboard()
  const { firstName, companyName } = useDashboardWelcome()

  const displayCompany = companyName ?? "your organization"

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
    { title: "Assigned", value: String(assigned), tone: "indigo", icon: Ticket },
    { title: "Open", value: String(open), tone: "rose", icon: BellRing },
    { title: "Resolved", value: String(resolved), tone: "emerald", icon: CheckCircle2 },
    { title: "Avg. Reply", value: avgReply, tone: "amber", icon: Clock3 },
    { title: "Rating", value: rating > 0 ? `${rating.toFixed(1)}/5` : "0/5", tone: "default", icon: Star },
    { title: "Follow-up", value: String(followUp), tone: "default", icon: TimerReset },
  ]

  const resolvedBars = useMemo(() => {
    const values = resolvedWeekly.slice(0, 7).map((item) => Math.max(item.total, 0))
    const padded = Array.from({ length: 7 }).map((_, idx) => values[idx] ?? 0)
    const max = Math.max(...padded, 1)

    return padded.map((value, index) => ({
      day: weekdays[index],
      value,
      height: Math.max(12, Math.round((value / max) * 120)),
    }))
  }, [resolvedWeekly])

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

  const topTeam = [...leaderboard].sort((a, b) => b.resolved - a.resolved).slice(0, 3)

  return (
    <div className="space-y-6 pb-10">
      <DashboardOverviewHeader
        title={`Welcome back, ${firstName}.`}
        subtitle={
          <>
            You have <span className="font-semibold text-slate-700">{urgentChats}</span> urgent chats
            needing attention at{" "}
            <span className="font-semibold text-slate-700">{displayCompany}</span>.
          </>
        }
        isFetching={isFetching}
        onRefresh={refetch}
        showRangePicker={false}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {miniStats.map((item) => (
          <Card key={item.title} className="border-border/70">
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
                {isFetching ? <span className="text-[10px] text-muted-foreground">updating...</span> : null}
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{item.title}</p>
                <p className="mt-1 text-3xl font-semibold leading-none text-foreground">
                  {isLoading ? "--" : item.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_1.2fr_1fr]">
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Resolved Weekly</CardTitle>
            <CardDescription>Current week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-36 items-end gap-2">
              {resolvedBars.map((bar) => (
                <div key={bar.day} className="flex-1 space-y-2 text-center">
                  <div className="mx-auto w-full rounded-md bg-indigo-100" style={{ height: `${bar.height}px` }} />
                  <p className="text-[10px] font-medium text-muted-foreground">{bar.day}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Response Time</CardTitle>
            <CardDescription>Average handling speed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {responseRows.map((row) => (
              <div key={row.day} className="grid grid-cols-[48px_1fr_40px] items-center gap-3">
                <p className="text-xs font-medium text-muted-foreground">{row.day}</p>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-emerald-600" style={{ width: row.width }} />
                </div>
                <p className="text-xs font-semibold text-foreground">{row.label}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70">
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
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Excellent</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Auto-calculated from customer feedback</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Card className="border-border/70">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Priority Assignments</CardTitle>
              <CardDescription>Your active queue</CardDescription>
            </div>
            <Button variant="ghost" className="text-primary">
              View all
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {priorityAssignments.slice(0, 4).map((item) => (
                <div key={item.id} className="grid grid-cols-[1.8fr_120px_100px_50px] items-center gap-2 rounded-lg border border-border/70 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.customerName}</p>
                    <p className="text-xs text-muted-foreground">{item.subject}</p>
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">{item.status}</p>
                  <p className="text-xs text-muted-foreground">{item.waitTimeMinutes}m</p>
                  <MessageSquareMore className="ml-auto size-4 text-muted-foreground" />
                </div>
              ))}
              {priorityAssignments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active assignments yet.</p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="border-border/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Team Leaderboard</CardTitle>
              <CardDescription>Top performers this period</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {topTeam.map((member, idx) => (
                <div key={`${member.name}-${idx}`} className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.successRate}% success</p>
                  </div>
                  <p className="text-xs font-bold text-primary">#{member.rank || idx + 1}</p>
                </div>
              ))}
              {topTeam.length === 0 ? <p className="text-sm text-muted-foreground">No staff data yet.</p> : null}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-violet-50/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Live Updates</CardTitle>
              <CardDescription>Recent activity highlights</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {liveUpdates.map((update, index) => (
                <p key={`${update.text}-${index}`} className={index === 0 ? "text-foreground" : "text-muted-foreground"}>
                  {update.text} · {update.time}
                </p>
              ))}
              {liveUpdates.length === 0 ? (
                <p className="text-muted-foreground">No new updates yet.</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <Card className="border-border/70">
          <CardContent className="flex items-center gap-4 p-6">
            <span className="inline-flex size-12 items-center justify-center rounded-xl bg-[#0E7C70] text-white">
              <CalendarDays className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Today&apos;s Shift</p>
              <p className="text-2xl font-bold text-foreground">
                {schedule?.shiftStart ?? "09:00"} - {schedule?.shiftEnd ?? "17:00"}
              </p>
              <p className="text-xs text-emerald-700">
                Ending in {Math.max(0, Math.round((schedule?.remainingShiftMinutes ?? 0) / 60))}h{" "}
                {(schedule?.remainingShiftMinutes ?? 0) % 60}m
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Notes</CardTitle>
            <CardDescription>Quick reminders</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {notes.map((note, index) => (
              <div key={`${note}-${index}`} className="rounded-lg border-l-2 border-primary bg-muted/40 px-3 py-2 text-sm text-foreground">
                {note}
              </div>
            ))}
            {notes.length === 0 ? <p className="text-sm text-muted-foreground">No notes for now.</p> : null}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

export default StaffDashboard

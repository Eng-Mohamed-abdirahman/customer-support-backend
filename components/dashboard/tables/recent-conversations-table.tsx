"use client"

import { motion } from "framer-motion"
import { ArrowUpRight, MessageCircle, Mail, Phone, Globe, MessageSquare } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { fadeInUp } from "@/components/dashboard/shared/animations"
import type { RecentConversation } from "@/components/dashboard/cards/types"
import { MessageCircleOff } from "lucide-react"

// Custom Instagram SVG icon (avoids lucide-react version mismatches)
const Instagram = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={props.className}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
)

interface RecentConversationsTableProps {
  data?: RecentConversation[]
  isLoading?: boolean
}

const channelConfigs = {
  chat: {
    label: "Website",
    icon: Globe,
    className: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50",
  },
  website: {
    label: "Website",
    icon: Globe,
    className: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50",
  },
  whatsapp: {
    label: "WhatsApp",
    icon: MessageCircle,
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50",
  },
  email: {
    label: "Email",
    icon: Mail,
    className: "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-50",
  },
  phone: {
    label: "Phone",
    icon: Phone,
    className: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50",
  },
  messenger: {
    label: "Messenger",
    icon: MessageSquare,
    className: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50",
  },
  instagram: {
    label: "Instagram",
    icon: Instagram,
    className: "bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-50",
  },
} as const

const statusConfigs = {
  open: {
    label: "Open",
    className: "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-50",
  },
  pending: {
    label: "Pending",
    className: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50",
  },
  resolved: {
    label: "Resolved",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50",
  },
  closed: {
    label: "Closed",
    className: "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-50",
  },
  escalated: {
    label: "Escalated",
    className: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-50",
  },
} as const

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell className="py-3.5 pl-6">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-36" />
              </div>
            </div>
          </TableCell>
          <TableCell><Skeleton className="h-5 w-20 rounded-md" /></TableCell>
          <TableCell><Skeleton className="h-5 w-16 rounded-md" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell className="text-right pr-6"><Skeleton className="h-4 w-14 ml-auto" /></TableCell>
        </TableRow>
      ))}
    </>
  )
}

export function RecentConversationsTable({ data = [], isLoading = false }: RecentConversationsTableProps) {
  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className="w-full"
    >
      <Card className="border-border/50 bg-white shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold text-foreground">Recent Conversations</CardTitle>
          </div>
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary-dark flex items-center gap-1">
            View All <ArrowUpRight className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="font-semibold text-xs py-3 pl-6">CUSTOMER</TableHead>
                  <TableHead className="font-semibold text-xs py-3">CHANNEL</TableHead>
                  <TableHead className="font-semibold text-xs py-3">STATUS</TableHead>
                  <TableHead className="font-semibold text-xs py-3">ASSIGNED STAFF</TableHead>
                  <TableHead className="font-semibold text-xs py-3 text-right pr-6">TIME</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <SkeletonRows />
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <MessageCircleOff className="h-10 w-10 text-slate-300" />
                        <p className="font-semibold text-sm text-slate-600">No recent conversations</p>
                        <p className="text-xs text-slate-400">
                          Conversations will appear here once customers start reaching out.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((item) => {
                    const channelKey = item.channel?.toLowerCase() as keyof typeof channelConfigs
                    const channelConfig = channelConfigs[channelKey] ?? {
                      label: item.channel,
                      icon: Globe,
                      className: "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-50",
                    }

                    const statusKey = item.status?.toLowerCase() as keyof typeof statusConfigs
                    const statusConfig = statusConfigs[statusKey] ?? {
                      label: item.status,
                      className: "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-50",
                    }

                    const DisplayChannelIcon = channelConfig.icon

                    return (
                      <TableRow
                        key={item.id}
                        className="group cursor-pointer hover:bg-muted/30 transition-colors duration-150"
                      >
                        <TableCell className="py-3.5 pl-6">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border border-border/40">
                              <AvatarFallback className="bg-primary/5 text-primary text-xs font-semibold">
                                {item.customer.avatar}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                                {item.customer.name}
                              </span>
                              <span className="text-xs text-muted-foreground hidden sm:inline">
                                {item.customer.email}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <Badge
                            variant="outline"
                            className={`flex w-fit items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider rounded-md border ${channelConfig.className}`}
                          >
                            <DisplayChannelIcon className="h-3 w-3" />
                            {channelConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <Badge
                            variant="outline"
                            className={`px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-md border ${statusConfig.className}`}
                          >
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <span className="text-sm font-medium text-foreground">{item.assignedTo}</span>
                        </TableCell>
                        <TableCell className="py-3.5 text-right pr-6 text-xs font-medium text-muted-foreground">
                          {item.time}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

"use client"

import { motion } from "framer-motion"
import { HelpCircle, FileText } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { fadeInUp } from "@/components/dashboard/shared/animations"
import type { AiKnowledgeData } from "@/components/dashboard/cards/types"

interface AiKnowledgeCardProps {
  data?: AiKnowledgeData
  isLoading?: boolean
}

export function AiKnowledgeCard({ data, isLoading = false }: AiKnowledgeCardProps) {
  if (isLoading) {
    return (
      <Card className="border-border/50 bg-white shadow-sm h-full">
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-44" />
        </CardHeader>
        <CardContent className="flex flex-col gap-5 py-4">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-2">
            <Skeleton className="h-5 w-36 rounded-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-24" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Provide meaningful fallback content if no data is available
  const topFaq = data?.topFaq?.[0] ?? "No FAQ data available"
  const faqUsage = data?.mostSearchedTopics?.[0]?.searches
    ? `Used ${data.mostSearchedTopics[0].searches} times today`
    : "No usage data"

  const article = data?.mostUsefulArticle?.title ?? "No article data available"
  const successRate = data?.mostUsefulArticle?.helpfulRate
    ? `${data.mostUsefulArticle.helpfulRate}% Success Rate`
    : data?.successRate
    ? `${data.successRate}% Success Rate`
    : "No rating data"

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
            AI Knowledge Usage
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col flex-1 justify-center gap-5 py-4">
          {/* Top FAQ Section */}
          <div className="group rounded-2xl border border-slate-100 bg-slate-50/50 p-4 transition-all duration-200 hover:bg-slate-50 hover:shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <Badge className="bg-violet-50 text-violet-700 border-violet-100 font-bold text-[9px] uppercase tracking-wider hover:bg-violet-50">
                Top FAQ
              </Badge>
              <HelpCircle className="h-4 w-4 text-violet-400 group-hover:rotate-12 transition-transform" />
            </div>
            <h4 className="font-semibold text-sm text-foreground line-clamp-2 mb-1">
              &ldquo;{topFaq}&rdquo;
            </h4>
            <p className="text-xs text-muted-foreground font-medium">{faqUsage}</p>
          </div>

          {/* Most Useful Article Section */}
          <div className="group rounded-2xl border border-slate-100 bg-slate-50/50 p-4 transition-all duration-200 hover:bg-slate-50 hover:shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold text-[9px] uppercase tracking-wider hover:bg-emerald-50">
                Most Useful Article
              </Badge>
              <FileText className="h-4 w-4 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <h4 className="font-semibold text-sm text-foreground line-clamp-2 mb-1">{article}</h4>
            <p className="text-xs text-emerald-600 font-bold">{successRate}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default AiKnowledgeCard

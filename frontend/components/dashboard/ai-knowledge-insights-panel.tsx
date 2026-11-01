"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  BookOpen,
  MessageCircleQuestion,
  Flame,
  BarChart3,
  Calendar,
  ChevronRight,
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { useKnowledgeInsights } from "@/hooks/useKnowledgeInsights"
import { fadeInUp, staggerContainer } from "@/components/dashboard/shared/animations"

const rangeLabels: Record<string, string> = {
  today: "Today",
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  "90d": "Last 90 Days",
}

// ─── Skeleton Loaders ────────────────────────────────────────────────────────

function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-6 w-12 rounded-full" />
        </div>
      ))}
    </div>
  )
}

// ─── Sub-Sections ─────────────────────────────────────────────────────────────

function SummarySection({ summary, isLoading }: { summary?: string; isLoading: boolean }) {
  return (
    <motion.div variants={fadeInUp} className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50/80 to-blue-50/40 p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100">
          <Brain className="h-4 w-4 text-sky-600" />
        </div>
        <span className="text-xs font-bold uppercase tracking-widest text-sky-600">AI Summary</span>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ) : (
        <p className="text-sm text-slate-700 leading-relaxed font-medium">
          {summary ?? "No summary available for this period."}
        </p>
      )}
    </motion.div>
  )
}

function TopQuestionsSection({
  questions,
  isLoading,
}: {
  questions?: { question: string; count: number; trend: number }[]
  isLoading: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? questions : questions?.slice(0, 5)

  const rankColors = [
    "bg-amber-500",
    "bg-slate-400",
    "bg-orange-400",
    "bg-sky-400",
    "bg-violet-400",
  ]

  return (
    <motion.div variants={fadeInUp}>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100">
          <Flame className="h-4 w-4 text-rose-500" />
        </div>
        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Top Questions</span>
        {!isLoading && questions && (
          <Badge className="ml-auto text-[10px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-100 border-0">
            {questions.length} topics
          </Badge>
        )}
      </div>

      {isLoading ? (
        <SectionSkeleton rows={5} />
      ) : !questions?.length ? (
        <p className="text-sm text-slate-400 text-center py-4">No questions found for this period.</p>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {visible?.map((item, i) => (
              <motion.div
                key={item.question}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, delay: i * 0.04 }}
                className="group flex items-center gap-3 rounded-xl p-2.5 hover:bg-slate-50 transition-colors"
              >
                {/* Rank badge */}
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-extrabold text-white ${rankColors[i] ?? "bg-slate-300"}`}
                >
                  {i + 1}
                </div>

                {/* Question text */}
                <span className="flex-1 text-sm font-medium text-slate-700 leading-snug line-clamp-2">
                  {item.question}
                </span>

                {/* Count + trend */}
                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  <span className="text-sm font-extrabold text-slate-900 tabular-nums">{item.count}</span>
                  {item.trend !== 0 && (
                    <span
                      className={`flex items-center gap-0.5 text-[10px] font-bold ${item.trend > 0 ? "text-emerald-600" : "text-rose-500"}`}
                    >
                      {item.trend > 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {Math.abs(item.trend)}%
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {questions.length > 5 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex w-full items-center justify-center gap-1 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
            >
              {expanded ? (
                <>Show less <ChevronUp className="h-3.5 w-3.5" /></>
              ) : (
                <>Show {questions.length - 5} more <ChevronDown className="h-3.5 w-3.5" /></>
              )}
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}

function TrendingSection({
  topics,
  isLoading,
}: {
  topics?: { topic: string; changePercent: number }[]
  isLoading: boolean
}) {
  return (
    <motion.div variants={fadeInUp}>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100">
          <BarChart3 className="h-4 w-4 text-violet-500" />
        </div>
        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Trending Topics</span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : !topics?.length ? (
        <p className="text-sm text-slate-400 text-center py-4">No trending topics detected.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {topics.map((item) => (
            <div
              key={item.topic}
              className="group rounded-xl border border-border/50 bg-white p-3 hover:border-violet-200 hover:bg-violet-50/30 transition-all cursor-default"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-700 truncate pr-1">{item.topic}</span>
                {item.changePercent > 0 ? (
                  <TrendingUp className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                )}
              </div>
              <span
                className={`text-lg font-extrabold tabular-nums ${
                  item.changePercent > 0 ? "text-emerald-600" : "text-rose-500"
                }`}
              >
                {item.changePercent > 0 ? "+" : ""}
                {item.changePercent}%
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

function RecommendationsSection({
  articles,
  isLoading,
}: {
  articles?: { title: string; reason: string; confidence: number }[]
  isLoading: boolean
}) {
  return (
    <motion.div variants={fadeInUp}>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100">
          <Lightbulb className="h-4 w-4 text-amber-500" />
        </div>
        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">AI Recommendations</span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : !articles?.length ? (
        <p className="text-sm text-slate-400 text-center py-4">No recommendations available.</p>
      ) : (
        <div className="space-y-2.5">
          {articles.map((article, i) => (
            <div
              key={i}
              className="group rounded-xl border border-amber-100 bg-gradient-to-r from-amber-50/60 to-white p-4 hover:border-amber-300 hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 mt-0.5">
                  <BookOpen className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-bold text-slate-800 truncate">{article.title}</h4>
                    <span className="ml-auto shrink-0 text-[11px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">
                      {article.confidence}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{article.reason}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-amber-500 transition-colors mt-1" />
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

function UnansweredSection({
  topics,
  isLoading,
}: {
  topics?: string[]
  isLoading: boolean
}) {
  return (
    <motion.div variants={fadeInUp}>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100">
          <MessageCircleQuestion className="h-4 w-4 text-rose-500" />
        </div>
        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Unanswered Topics</span>
        {!isLoading && topics && topics.length > 0 && (
          <Badge className="ml-auto text-[10px] font-bold bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-50">
            {topics.length} gaps
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 rounded-lg" />
          ))}
        </div>
      ) : !topics?.length ? (
        <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium py-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          All customer questions were addressed.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {topics.map((topic, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 rounded-lg border border-rose-100 bg-rose-50/60 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:border-rose-300 transition-colors cursor-default"
            >
              <AlertTriangle className="h-3 w-3 shrink-0" />
              {topic}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AiKnowledgeInsightsPanel() {
  const [range, setRange] = useState("7d")
  const { data, isLoading, isFetching, isError, error, refetch } = useKnowledgeInsights(range)

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#13B8A6] to-[#12304A] shadow-sm">
              <Sparkles className="h-4.5 w-4.5 text-white" />
            </div>
            <h1 className="text-[28px] leading-9 font-bold text-navy-800 sm:text-[32px] sm:leading-10">AI Knowledge Insights</h1>
          </div>
          <p className="text-sm text-slate-500 ml-11.5">
            AI-powered analysis of real customer conversations — updated every 5 minutes.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Range Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2 border-border/80 bg-white text-xs font-semibold text-slate-700 shadow-sm rounded-lg"
              >
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                {rangeLabels[range]}
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 bg-white shadow-md rounded-xl border border-border">
              {Object.entries(rangeLabels).map(([key, label]) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => setRange(key)}
                  className="text-xs font-semibold cursor-pointer"
                >
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Refresh */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9 w-9 border-border/80 bg-white shadow-sm rounded-lg"
          >
            <RefreshCw className={`h-4 w-4 text-slate-500 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </motion.div>

      {/* Error Banner */}
      <AnimatePresence>
        {isError && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-5 py-3 text-rose-700"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <p className="text-sm font-medium flex-1">{error?.message ?? "Failed to load insights."}</p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => refetch()}
              className="text-xs text-rose-700 hover:bg-rose-100 h-7"
            >
              Retry
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Grid */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid gap-6 lg:grid-cols-12"
      >
        {/* Left column — Summary + Top Questions */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-border/50 bg-white shadow-sm">
            <CardContent className="pt-6 space-y-6">
              <SummarySection summary={data?.summary} isLoading={isLoading} />
              <div className="border-t border-border/40 pt-6">
                <TopQuestionsSection questions={data?.topQuestions} isLoading={isLoading} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column — Trending + Recommendations + Unanswered */}
        <div className="lg:col-span-7 space-y-6">
          {/* Trending + Unanswered side by side on md+ */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-border/50 bg-white shadow-sm">
              <CardContent className="pt-6">
                <TrendingSection topics={data?.trendingTopics} isLoading={isLoading} />
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-white shadow-sm">
              <CardContent className="pt-6">
                <UnansweredSection topics={data?.unansweredTopics} isLoading={isLoading} />
              </CardContent>
            </Card>
          </div>

          {/* Recommendations - full width */}
          <Card className="border-border/50 bg-white shadow-sm">
            <CardContent className="pt-6">
              <RecommendationsSection articles={data?.recommendedArticles} isLoading={isLoading} />
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  )
}

export default AiKnowledgeInsightsPanel

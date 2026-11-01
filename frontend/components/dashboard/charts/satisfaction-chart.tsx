"use client"

import { motion } from "framer-motion"
import { Star } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { fadeInUp } from "@/components/dashboard/shared/animations"

interface CustomerSatisfactionProps {
  score?: number
  totalReviews?: number
  isLoading?: boolean
}

export function CustomerSatisfaction({
  score = 0,
  totalReviews = 0,
  isLoading = false,
}: CustomerSatisfactionProps) {
  // Circular progress math
  const radius = 60
  const strokeWidth = 8
  const circumference = 2 * Math.PI * radius
  const progressPercent = Math.max(0, Math.min((score / 5) * 100, 100))
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference

  // Render stars based on score
  const renderStars = (rating: number) => {
    const stars = []
    const fullStars = Math.floor(rating)

    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(<Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />)
      } else if (i === fullStars + 1 && rating % 1 !== 0) {
        // Half star via overflow clip
        stars.push(
          <div key={i} className="relative inline-block">
            <Star className="h-5 w-5 text-gray-200 fill-gray-200" />
            <div className="absolute top-0 left-0 overflow-hidden w-1/2">
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
            </div>
          </div>
        )
      } else {
        stars.push(<Star key={i} className="h-5 w-5 text-gray-200 fill-gray-200" />)
      }
    }
    return stars
  }

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-white shadow-sm h-full">
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-44" />
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-5 pb-6">
          <Skeleton className="h-36 w-36 rounded-full" />
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-5 rounded" />
              ))}
            </div>
            <Skeleton className="h-4 w-28" />
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
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Customer Satisfaction
          </CardTitle>
          <CardDescription className="hidden">Post-chat survey scores</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col items-center justify-center flex-1 py-4 gap-4">
          {/* Circular Indicator */}
          <div className="relative flex items-center justify-center">
            <svg className="h-36 w-36 transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="72"
                cy="72"
                r={radius}
                className="stroke-muted fill-transparent"
                strokeWidth={strokeWidth}
              />
              {/* Progress circle */}
              <motion.circle
                cx="72"
                cy="72"
                r={radius}
                className="stroke-primary fill-transparent"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1, ease: "easeOut" }}
                strokeLinecap="round"
              />
            </svg>

            {/* Center Label */}
            <div className="absolute flex flex-col items-center justify-center">
              <div className="flex items-baseline">
                <span className="text-4xl font-extrabold text-foreground tracking-tight">
                  {score > 0 ? score.toFixed(1) : "—"}
                </span>
                {score > 0 && (
                  <span className="text-sm font-semibold text-muted-foreground">/5.0</span>
                )}
              </div>
            </div>
          </div>

          {/* Star Rating */}
          <div className="flex flex-col items-center gap-1.5 mt-2">
            {score > 0 ? (
              <>
                <div className="flex items-center gap-1">{renderStars(score)}</div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">
                  {totalReviews.toLocaleString()} reviews
                </span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground text-center">
                No reviews yet for this period
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default CustomerSatisfaction

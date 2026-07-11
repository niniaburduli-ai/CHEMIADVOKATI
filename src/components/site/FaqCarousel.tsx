"use client"

import { useLayoutEffect, useRef, useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, ChevronDown, ArrowLeft, List } from "lucide-react"

type FaqItem = { _id: string; question: string; answer: string }

function cardStateClass(idx: number, current: number, total: number) {
  if (idx === current) return "faq-card-active"
  if (idx === (current - 1 + total) % total) return "faq-card-prev"
  if (idx === (current + 1) % total) return "faq-card-next"
  return idx < current ? "faq-card-hidden-left" : "faq-card-hidden-right"
}

const VIEW_ALL_CLASS =
  "inline-flex items-center gap-2 text-sm font-semibold bg-primary text-primary-foreground rounded-xl px-5 py-2.5 hover:bg-primary/90 transition-colors btn-hover"

export function FaqCarousel({
  items,
  labels = { viewAll: "View all questions", back: "Back" },
  viewAllHref,
}: {
  items: FaqItem[]
  labels?: { viewAll: string; back: string }
  /** When set, "view all" navigates here instead of toggling an inline list. */
  viewAllHref?: string
}) {
  const [current, setCurrent] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const [viewAll, setViewAll] = useState(false)
  const innerRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])

  // Measure the active card's real content height so the carousel can grow
  // to fit long answers instead of clipping them.
  useLayoutEffect(() => {
    const inner = innerRef.current
    const activeCard = cardRefs.current[current]
    if (!inner) return
    if (expanded && activeCard) {
      const resize = () => {
        inner.style.height = `${activeCard.scrollHeight}px`
      }
      resize()
      const observer = new ResizeObserver(resize)
      observer.observe(activeCard)
      return () => observer.disconnect()
    }
    inner.style.height = ""
  }, [expanded, current])

  if (items.length === 0) return null

  function goTo(idx: number) {
    setCurrent(idx)
    setExpanded(false)
  }

  if (viewAll) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setViewAll(false)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:gap-3 transition-all mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          {labels.back}
        </button>
        <div className="space-y-4">
          {items.map((f) => (
            <div key={f._id} className="bg-card border border-border rounded-2xl p-6 md:p-7">
              <p className="font-bold text-foreground mb-2">{f.question}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.answer}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-center mb-4">
        {viewAllHref ? (
          <Link href={viewAllHref} className={VIEW_ALL_CLASS}>
            <List className="h-4 w-4" />
            {labels.viewAll}
          </Link>
        ) : (
          <button type="button" onClick={() => setViewAll(true)} className={VIEW_ALL_CLASS}>
            <List className="h-4 w-4" />
            {labels.viewAll}
          </button>
        )}
      </div>

      {items.length > 1 && (
        <div className="flex justify-center items-center gap-2 mb-4">
          {items.map((f, idx) => (
            <button
              key={f._id}
              type="button"
              aria-label={`${idx + 1}`}
              onClick={() => goTo(idx)}
              className={
                idx === current
                  ? "h-2 w-8 rounded-full bg-primary transition-all"
                  : "h-2 w-2 rounded-full bg-border transition-all hover:bg-muted-foreground/40"
              }
            />
          ))}
        </div>
      )}

      <div className="relative">
        <div className="faq-carousel-wrapper">
          <div ref={innerRef} className="faq-carousel-inner">
            {items.map((f, idx) => {
              const isActive = idx === current
              const isExpanded = isActive && expanded
              return (
                <div
                  key={f._id}
                  ref={(el) => {
                    cardRefs.current[idx] = el
                  }}
                  onClick={() => isActive && setExpanded((e) => !e)}
                  role={isActive ? "button" : undefined}
                  aria-expanded={isActive ? isExpanded : undefined}
                  className={`faq-card bg-card border border-border rounded-2xl p-4 md:p-5 text-center flex flex-col gap-1.5 shadow-sm ${cardStateClass(idx, current, items.length)} ${
                    expanded && !isActive ? "faq-card-dim" : ""
                  } ${isActive ? "cursor-pointer" : ""}`}
                >
                  <p className="font-bold text-base text-foreground">{f.question}</p>
                  <p
                    className={`text-sm text-muted-foreground leading-relaxed ${
                      isExpanded ? "" : "line-clamp-3"
                    }`}
                  >
                    {f.answer}
                  </p>
                  {isActive && (
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground mx-auto transition-transform duration-300 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo((current - 1 + items.length) % items.length)}
              aria-label="Previous"
              className="absolute left-0 md:left-4 top-1/2 -translate-y-1/2 z-40 bg-card w-11 h-11 rounded-full shadow-lg border border-border flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all btn-hover"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => goTo((current + 1) % items.length)}
              aria-label="Next"
              className="absolute right-0 md:right-4 top-1/2 -translate-y-1/2 z-40 bg-card w-11 h-11 rounded-full shadow-lg border border-border flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all btn-hover"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

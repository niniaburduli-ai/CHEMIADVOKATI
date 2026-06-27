import type { Metadata } from "next"
import { getPublishedBlogPosts } from "@/lib/cms"
import { getLocale } from "@/lib/i18n/locale"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { PageHero } from "@/components/site/PageHero"
import { AnimateIn } from "@/components/site/AnimateIn"

export const metadata: Metadata = {
  title: "ბლოგი | ჩემი იურისტი",
  description: "სამართლებრივი სიახლეები და სტატიები",
}

export default async function BlogPage() {
  const locale = await getLocale()
  const posts = await getPublishedBlogPosts(locale)

  return (
    <div>
      <PageHero title="ბლოგი" subtitle="სამართლებრივი სიახლეები და სტატიები" />

      <section className="container mx-auto max-w-4xl px-4 py-14">
        {posts.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">პოსტები არ არის.</p>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {posts.map((post, idx) => (
              <AnimateIn key={post._id?.toString()} delay={idx * 60}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="bg-card border border-border border-t-[3px] border-t-primary rounded-2xl p-6 flex flex-col gap-3 card-hover group h-full"
                >
                  <p className="font-bold text-foreground leading-snug">{post.title}</p>
                  {post.excerpt && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{post.excerpt}</p>
                  )}
                  <div className="mt-auto flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:gap-2.5 transition-all">
                    წაიკითხეთ <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              </AnimateIn>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

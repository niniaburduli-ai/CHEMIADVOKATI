export function PageHero({
  title,
  subtitle,
}: {
  title: string
  subtitle?: string
}) {
  return (
    <section className="bg-primary dark:bg-slate-900">
      <div className="container mx-auto px-4 py-16 max-w-5xl">
        <h1 className="text-5xl md:text-6xl font-bold text-white animate-fade-up leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xl text-gold mt-3 font-semibold animate-fade-up delay-150 leading-snug max-w-4xl whitespace-pre-line">
            {subtitle}
          </p>
        )}
      </div>
    </section>
  )
}

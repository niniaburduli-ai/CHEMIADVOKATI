export function PageHero({
  title,
  subtitle,
}: {
  title: string
  subtitle?: string
}) {
  return (
    <section className="bg-primary">
      <div className="container mx-auto px-4 py-12 md:py-16 max-w-5xl">
        <h1 className="text-5xl md:text-6xl font-bold text-white animate-fade-up leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xl text-gold mt-3 font-semibold animate-fade-up delay-150 leading-snug max-w-2xl">
            {subtitle}
          </p>
        )}
      </div>
    </section>
  )
}

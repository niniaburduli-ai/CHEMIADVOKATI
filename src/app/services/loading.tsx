export default function ServicesLoading() {
  return (
    <div>
      <div className="bg-slate-900 py-16">
        <div className="container mx-auto px-4 max-w-6xl animate-pulse space-y-3">
          <div className="h-8 w-64 rounded bg-white/10" />
          <div className="h-4 w-96 max-w-full rounded bg-white/10" />
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 max-w-6xl">
        <div className="flex flex-col gap-6 md:grid md:grid-cols-[minmax(18rem,1fr)_3fr] animate-pulse">
          <aside className="w-full flex flex-col gap-3">
            <div className="bg-card border border-border rounded-2xl p-3 h-40" />
            <div className="bg-card border border-border rounded-2xl p-3 h-20" />
            <div className="bg-card border border-border rounded-2xl p-3 h-28" />
          </aside>
          <section className="min-w-0 h-[520px] bg-card border border-border rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

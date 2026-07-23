export default function DashboardLoading() {
  return (
    <div>
      <section className="bg-slate-900">
        <div className="container mx-auto px-4 py-16 max-w-5xl">
          <div className="flex items-center gap-5 flex-wrap animate-pulse">
            <div className="h-16 w-16 rounded-full bg-white/10 shrink-0" />
            <div className="flex-1 min-w-0 space-y-3">
              <div className="h-8 w-56 rounded bg-white/10" />
              <div className="h-4 w-40 rounded bg-white/10" />
            </div>
            <div className="h-9 w-32 rounded-md bg-white/10" />
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-10">
        <div className="flex flex-col md:flex-row gap-6 animate-pulse">
          <aside className="w-full md:w-80 shrink-0 space-y-3">
            <div className="bg-card border border-border rounded-2xl p-3 h-40" />
            <div className="bg-card border border-border rounded-2xl p-3 h-32" />
          </aside>
          <section className="flex-1 min-w-0 h-[520px] bg-card border border-border rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

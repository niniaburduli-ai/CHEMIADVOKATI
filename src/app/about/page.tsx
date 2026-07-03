import type { Metadata } from 'next'
import { getAboutPage } from '@/lib/cms'
import { getLocale } from '@/lib/i18n/locale'
import { getDict } from '@/lib/i18n/dictionaries'
import { Info, Clock, Target, Users } from 'lucide-react'
import Image from 'next/image'
import { AnimateIn } from '@/components/site/AnimateIn'
import { PageHero } from '@/components/site/PageHero'

export const metadata: Metadata = {
  title: 'ჩვენ შესახებ | ჩემი იურისტი',
  description: 'ჩემი იურისტი - თანამედროვე იურიდიული პლატფორმა, რომელიც სამართალს ხელმისაწვდომს ხდის ყველასთვის.',
}

function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text.split('\n\n').map((p, i) => (
        <p key={i} className="leading-relaxed mb-4 last:mb-0">
          {p}
        </p>
      ))}
    </>
  )
}

export default async function AboutPage() {
  const locale = await getLocale()
  const cms = await getAboutPage(locale)
  const dict = getDict(locale)
  const d = dict.about

  const title = cms?.title || d.title
  const intro = cms?.intro || d.intro
  const historyTitle = cms?.historyTitle || d.historyTitle
  const historyBody = cms?.historyBody || d.historyBody
  const missionTitle = cms?.missionTitle || d.missionTitle
  const mission = cms?.mission || d.mission
  const team = [...(cms?.team ?? [])].sort((a, b) => a.order - b.order)

  const sections = [
    { id: 'intro', icon: Info, title, body: intro, multi: true },
    { id: 'history', icon: Clock, title: historyTitle, body: historyBody, multi: true },
    { id: 'mission', icon: Target, title: missionTitle, body: mission, multi: false },
  ]

  return (
    <div>
      <PageHero title={dict.home.heroTitle} subtitle={d.heroSubtitle} />

      <div className="container mx-auto px-4 py-16 max-w-5xl">
        <div className="flex flex-col gap-6">
          {sections.map((s, idx) => {
            const Icon = s.icon
            return (
              <AnimateIn key={s.id} delay={idx * 100}>
                <div className="border-t-[3px] border-t-primary bg-card border border-border rounded-2xl p-8 flex flex-col sm:flex-row gap-8 card-hover group">
                  <div className="shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl md:text-3xl font-bold leading-snug text-foreground">{s.title}</h2>
                    <div className="text-muted-foreground mt-3">
                      {s.multi ? <Paragraphs text={s.body} /> : <p className="leading-relaxed">{s.body}</p>}
                    </div>
                  </div>
                </div>
              </AnimateIn>
            )
          })}

          {team.length > 0 && (
            <AnimateIn delay={300}>
              <div className="border-t-[3px] border-t-primary bg-card border border-border rounded-2xl p-8 card-hover group">
                <div className="flex items-center gap-5 mb-8">
                  <div className="shrink-0 w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold leading-snug text-foreground">{d.teamTitle}</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                  {team.map((member, idx) => (
                    <AnimateIn key={String(member._id)} delay={idx * 80}>
                      <div className="flex flex-col items-center text-center gap-3">
                        {member.imageUrl ? (
                          <Image
                            src={member.imageUrl}
                            alt={member.name}
                            width={80}
                            height={80}
                            className="w-20 h-20 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-2xl font-bold text-primary">
                              {member.name[0] ?? '?'}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-foreground">{member.name}</p>
                          <p className="text-sm text-muted-foreground">{member.role}</p>
                        </div>
                      </div>
                    </AnimateIn>
                  ))}
                </div>
              </div>
            </AnimateIn>
          )}
        </div>
      </div>
    </div>
  )
}

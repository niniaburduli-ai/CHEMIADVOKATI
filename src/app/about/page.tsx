import type { Metadata } from 'next'
import { getAboutPage } from '@/lib/cms'
import { getLocale } from '@/lib/i18n/locale'
import { getDict } from '@/lib/i18n/dictionaries'
import { Users } from 'lucide-react'
import Image from 'next/image'
import { PageHero } from '@/components/site/PageHero'
import { AnimateIn } from '@/components/site/AnimateIn'

export const metadata: Metadata = {
  title: 'ჩვენ შესახებ | ჩემი იურისტი',
  description: 'ჩემი იურისტი - თანამედროვე იურიდიული პლატფორმა, რომელიც სამართალს ხელმისაწვდომს ხდის ყველასთვის.',
}

function Paragraphs({ text, className = '' }: { text: string; className?: string }) {
  return (
    <>
      {text.split('\n\n').map((p, i) => (
        <p key={i} className={'leading-relaxed mb-4 last:mb-0 ' + className}>
          {p}
        </p>
      ))}
    </>
  )
}

export default async function AboutPage() {
  const locale = await getLocale()
  const cms = await getAboutPage(locale)
  const d = getDict(locale).about

  const title = cms?.title || d.title
  const intro = cms?.intro || d.intro
  const historyTitle = cms?.historyTitle || d.historyTitle
  const historyBody = cms?.historyBody || d.historyBody
  const missionTitle = cms?.missionTitle || d.missionTitle
  const mission = cms?.mission || d.mission
  const team = [...(cms?.team ?? [])].sort((a, b) => a.order - b.order)

  return (
    <div>
      <PageHero title={title} />

      {/* INTRO */}
      <section className="container mx-auto px-4 py-12 md:py-16 max-w-3xl animate-fade-up delay-150">
        <div className="text-muted-foreground text-lg">
          <Paragraphs text={intro} />
        </div>
      </section>

      {/* HISTORY */}
      <section className="container mx-auto px-4 pb-16 md:pb-20 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-8 rounded-full bg-primary" />
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">{historyTitle}</h2>
        </div>
        <div className="text-muted-foreground">
          <Paragraphs text={historyBody} />
        </div>
      </section>

      {/* MISSION */}
      <section className="bg-muted/40 border-y border-border">
        <div className="container mx-auto px-4 py-16 md:py-20 max-w-3xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-8 rounded-full bg-primary" />
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">{missionTitle}</h2>
          </div>
          <p className="text-lg text-muted-foreground leading-relaxed">{mission}</p>
        </div>
      </section>

      {/* TEAM */}
      {team.length > 0 && (
        <section className="container mx-auto px-4 py-16 md:py-20 max-w-4xl">
          <div className="flex items-center gap-3 mb-10 justify-center">
            <Users className="h-6 w-6 text-primary" />
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">{d.teamTitle}</h2>
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
        </section>
      )}
    </div>
  )
}

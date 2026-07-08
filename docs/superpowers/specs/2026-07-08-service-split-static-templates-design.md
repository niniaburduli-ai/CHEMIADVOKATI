# Design: split into 4 independent services + static document templates

## Problem

`/api/generate` currently treats all 6 document types identically: every request
calls an AI model to draft the full document from scratch, then calls a second
AI model (web search) to verify citations. For 4 of those 6 types
(rental-agreement, employment-contract, power-of-attorney, termination-notice)
the legal structure is fixed — there's nothing for an AI to "draft," it's
filling in blanks. Paying for AI generation + citation verification on every
use is unnecessary cost with no quality benefit for these types.

The other 2 types (complaint, demand-letter) genuinely vary per case — the
user's specific grievance/argument needs real drafting — so AI generation
stays justified there.

## Goal

Split the product into 4 independent services, each with its own page and its
own quota counter:

1. **AI Legal Consultation** (`/chat`) — unchanged
2. **Document Analysis & Review** (`/review`) — unchanged
3. **Custom Document Generation** (`/generate`) — AI drafting, narrowed to
   `complaint` + `demand-letter` only
4. **Static Document Templates** (`/templates`, new) — pure string
   interpolation, zero AI calls, for `rental-agreement`,
   `employment-contract`, `power-of-attorney`, `termination-notice`

## Architecture

### Pages
- `/chat`, `/review` — no changes.
- `/generate` — `DOC_TYPES` / `QUESTION_SCHEMAS` narrowed to `complaint` and
  `demand-letter`. Copy updated to accurately describe "custom AI drafting"
  (today it's mislabeled "templates" in the nav — see i18n section).
- `/templates` (new) — same form-driven UX pattern as `/generate`
  (`QUESTION_SCHEMAS`-driven fields, already built), but:
  - Submits to `/api/templates` instead of `/api/generate`.
  - No loading-spinner "AI is drafting" framing — result is instant.
  - Reuses the existing result/preview/edit/export panel — extract that
    ~250-line block from `generate-client.tsx` into a shared component
    (e.g. `DocumentResultPanel`) so both pages render identically without
    duplicating JSX.

### Data model
- `User` schema: add `docTemplatesRemaining: { type: Number, default: 1 }`
  (4th independent counter, parallel to the existing 3).
- `Plan` model + `plans.ts` (`PLAN_LIMITS`) + `plans-db.ts`: add
  `docTemplates` / `includeDocTemplates` / `featuresDocTemplates` /
  `featuresDocTemplatesEn`, mirroring the existing `docGeneration` /
  `docReview` shape exactly (see touchpoint list below). Actual numeric
  limits are set later by the user — this phase just adds the field with a
  sane placeholder default (e.g. same as `docGeneration`'s current default).
- `GeneratedDocument` model: add `source: { type: String, enum: ["ai",
  "template"], required: true }` so history/stats can distinguish how a
  document was produced. Both flows keep writing to this one collection.

### New API route: `POST /api/templates`
- Zod-validates `type` (one of the 4 template types) + field answers.
- Looks up the static template definition (new file, see below), does plain
  `.replace()` interpolation — **no fetch to OpenRouter at all**.
- Blank optional fields (phone, bank account) render as `—`, not an empty
  string or literal bracket — same "never leave a placeholder visible" rule
  the AI path already follows, just enforced in code instead of a prompt.
- Saves as `GeneratedDocument` with `source: "template"`, decrements
  `docTemplatesRemaining` only. Never touches `docGenerationRemaining`.
- No `verifyLegalCitations` call — citations are hardcoded per template (see
  below) and shown via the same `legalBasis` field / `parseDocumentLegalBasis`
  renderer already used today, so the frontend needs zero changes to display
  them.

### `/api/generate` changes
- `GenerateDocSchema` / `DOC_TYPES` narrowed to `complaint` and
  `demand-letter`.
- Quota gate/decrement stays on `docGenerationRemaining`, now only consumed
  by these 2 types.

## Quota system (per user decision: abuse-prevention, not cost-control)

`docTemplatesRemaining` exists purely to rate-limit scripted abuse and
storage bloat — there's no marginal AI cost to protect. Actual numbers are
the user's call later (expect generous, e.g. 50–200/month range), but the
plumbing must support independent per-plan limits from day one.

### Confirmed touchpoints (full map from codebase audit)
Must touch to add the 4th counter cleanly:
1. `src/lib/models/user.ts` — add field
2. `src/lib/models/Plan.ts` — add `docTemplates`/`includeDocTemplates`/
   `featuresDocTemplates[En]` (schema + TS interface)
3. `src/lib/plans.ts` — add to `PLAN_LIMITS`
4. `src/lib/plans-db.ts` — add to types, all 3 `DEFAULT_PLANS` literals,
   `toData()` normalization, `getPlanLimits()`
5. `src/app/api/templates/route.ts` (new) — quota gate + decrement
6. `src/lib/flitt.ts` — add to `planActivationFields()` and
   `planDeactivationFields()`
7. `src/auth.ts`, `src/actions/auth.ts`,
   `src/app/api/auth/register/route.ts` — default grant on signup (note:
   these 3 signup paths are already inconsistent with each other for the
   existing 2 doc counters — worth fixing at the same time, flagged as a
   pre-existing bug, not new scope creep)
8. `src/app/api/user/me/route.ts` — currently doesn't even expose
   `docGenerationRemaining`/`docReviewRemaining`, only `consultationsRemaining`
   — same pre-existing gap, decide whether to fix alongside
9. `src/app/dashboard/page.tsx` — new `showTemplates`/`templatesLimit`/
   `templatesRemaining` vars + new `limitMetrics` card entry
10. `src/app/pricing/page.tsx`, `src/app/services/services-client.tsx`,
    `src/components/site/PricingSection.tsx` — feature-list rendering for
    the new plan field
11. `src/components/admin/PlansPanel.tsx` — full CRUD UI (type, defaults,
    include-badge, feature textareas, number input, submit payload) —
    largest single file touched
12. `src/components/admin/admin-dashboard.tsx` — table column + type (note:
    the edit modal today only supports editing `consultationsRemaining`,
    not the doc counters — same pre-existing gap)
13. `src/app/admin/page.tsx` — map new field into admin row objects
14. `src/app/api/admin/plans/route.ts` — Zod schema additions
15. `src/lib/i18n/dictionaries.ts` — KA/EN labels (4 relevant blocks; note
    existing missing `docReview` short-label entries — fix for consistency
    since we're touching these blocks anyway)
16. Optional: `src/components/admin/OverviewPanel.tsx` /
    `src/app/api/admin/stats/route.ts` — admin chart parity (today only
    consultations has a chart)

Pre-existing asymmetries noted above (signup paths, `/api/user/me`, admin
edit modal) are called out for awareness; fixing them is small and mechanical
once we're already touching these files for the 4th counter, but is not the
primary goal of this change.

## Frontend nav/copy
- `service-cards.tsx`, dashboard, i18n: add a 4th service card/nav entry.
- Fix mislabeling: today `servicesModal.templatesTab` describes the AI
  `/generate` page. Repoint that label to the new `/templates` page, and add
  an accurate new label for `/generate` (e.g. "custom document drafting").
- Feature flags (`admin/features`): add `flags.templates` alongside existing
  `flags.chat/review/generate`.

## Static template content

Each template is Georgian legal text with `[PLACEHOLDER]` tokens matching
the field keys already defined in `QUESTION_SCHEMAS` (generate-client.tsx),
plus a hardcoded `legalBasis` string in the exact format the existing
`parseDocumentLegalBasis` parser already expects (law name line, then
`- მუხლი N` bullet lines) — **zero frontend rendering changes needed**.

All article citations below were pulled directly from the live official text
at matsne.gov.ge (Civil Code: `document/view/31702`; Labor Code:
`document/view/1155567`) on 2026-07-08 — not from secondary sources/blogs,
several of which gave conflicting/wrong article numbers during research
(e.g. a legal blog claimed a 1-month tenant notice period; the actual Civil
Code Art. 561 says 3 months). Numbers below are verbatim-verified.

**Formatting convention** matches what `/api/generate`'s AI already produces
(and what `renderMarkdownBold` already renders): plain-text title on line 1,
numbered sections with `**N. Title**` in bold, data fields emphasized with
`**bold**`, max one blank line between sections.

---

### 1. Rental agreement (`rental-agreement`)
**Legal basis:** Civil Code of Georgia, Art. 531 (definition), 552 (deposit
capped at 3× monthly rent, refundable with interest), 553 (rent payment
timing), 558 (termination for 3 consecutive months' non-payment), 559
(termination at term expiry / indefinite-term notice), 561 (3-month notice
period unless otherwise agreed), 563 (termination must be written), 564
(tenant returns property in original condition, normal wear excepted).

```
ბინის ქირავნობის ხელშეკრულება

1. **მხარეები**
გამქირავებელი: **[LANDLORD]**, პ/ნ **[LANDLORD_ID]**, მისამართი: [LANDLORD_ADDRESS], ტელ: [LANDLORD_PHONE]
დამქირავებელი: **[TENANT]**, პ/ნ **[TENANT_ID]**, მისამართი: [TENANT_ADDRESS], ტელ: [TENANT_PHONE]
ხელშეკრულება დაიდო ქ. **[CITY]**-ში, **[DOC_DATE]**-ს (შემდგომში — „მხარეები").

2. **ხელშეკრულების საგანი**
გამქირავებელი გადასცემს დამქირავებელს სარგებლობაში საცხოვრებელ ფართს მისამართზე: **[PROPERTY_ADDRESS]** (შემდგომში — „ფართი").

3. **ხელშეკრულების ვადა**
ხელშეკრულება ძალაშია **[DURATION]**-ის განმავლობაში, **[DOC_DATE]**-დან.

4. **ქირის ოდენობა და გადახდის წესი**
ყოველთვიური ქირა შეადგენს **[RENT]**-ს. გადახდის მეთოდი: **[PAYMENT_METHOD]**. საბანკო ანგარიში: **[BANK_ACCOUNT]**. ქირა გადაიხდება ყოველი საანგარიშო პერიოდის დასრულებისას, თუ მხარეები სხვაგვარად არ შეთანხმდებიან.

5. **უზრუნველყოფის თანხა (დეპოზიტი)**
დამქირავებელს შეიძლება დაეკისროს უზრუნველყოფის თანხის წარდგენა, რომელიც არ აღემატება ერთი თვის ქირის სამმაგ ოდენობას. წინასწარ გადახდილ თანხას ერიცხება კანონით დადგენილი პროცენტი და უბრუნდება დამქირავებელს ხელშეკრულების დასრულებისას.

6. **მხარეთა ვალდებულებები**
6.1. გამქირავებელი გადასცემს ფართს გამართულ, დანიშნულებისამებრ გამოსაყენებელ მდგომარეობაში.
6.2. დამქირავებელი იყენებს ფართს დანიშნულებისამებრ და ზრუნავს მის შენარჩუნებაზე.
6.3. ხელშეკრულების შეწყვეტისას დამქირავებელი აბრუნებს ფართს იმ მდგომარეობაში, რომელშიც მიიღო, ნორმალური ცვეთის გათვალისწინებით.

7. **ხელშეკრულების ვადამდე შეწყვეტა**
7.1. თუ დამქირავებელი არ იხდის ქირას ზედიზედ სამი თვის განმავლობაში, გამქირავებელს უფლება აქვს მოშალოს ხელშეკრულება ვადამდე.
7.2. განუსაზღვრელი ვადის შემთხვევაში, ნებისმიერ მხარეს შეუძლია მოშალოს ხელშეკრულება წერილობითი შეტყობინებით, სამთვიანი ვადის დაცვით, თუ მხარეები სხვა ვადაზე არ შეთანხმდნენ.
7.3. ხელშეკრულების შეწყვეტა ფორმდება წერილობით.

8. **დასკვნითი დებულებები**
ხელშეკრულება შედგენილია 2 ეგზემპლარად, თითო თითოეული მხარისთვის, თანაბარი იურიდიული ძალით.

გამქირავებელი: ____________ **[LANDLORD]**
დამქირავებელი: ____________ **[TENANT]**
```

### 2. Employment contract (`employment-contract`)
**Legal basis:** Labor Code of Georgia, Art. 14 (mandatory contract content),
44 (final settlement within 7 days of termination), 47 (termination
grounds), 48 (termination procedure/notice).

```
შრომის ხელშეკრულება

1. **მხარეები**
დამსაქმებელი: **[EMPLOYER]**, ს/ნ **[EMPLOYER_ID]**, მისამართი: [EMPLOYER_ADDRESS]
დასაქმებული: **[EMPLOYEE]**, პ/ნ **[EMPLOYEE_ID]**, მისამართი: [EMPLOYEE_ADDRESS]
ხელშეკრულება დაიდო ქ. **[CITY]**-ში, **[DOC_DATE]**-ს.

2. **სამუშაოს დაწყება და ხანგრძლივობა**
დასაქმებული იწყებს მუშაობას **[START_DATE]**-დან. ხელშეკრულება დადებულია განუსაზღვრელი ვადით, თუ მხარეები წერილობით სხვაგვარად არ შეთანხმდებიან.

3. **თანამდებობა**
დასაქმებული ასრულებს **[POSITION]**-ის მოვალეობებს დამსაქმებლის მითითებების შესაბამისად.

4. **სამუშაო დრო და დასვენება**
სამუშაო დრო და დასვენების პერიოდები განისაზღვრება საქართველოს შრომის კოდექსისა და დამსაქმებლის შინაგანაწესის შესაბამისად (არსებობის შემთხვევაში).

5. **ანაზღაურება**
თანამდებობრივი სარგო შეადგენს **[SALARY]**-ს თვეში. გადახდის მეთოდი: **[SALARY_PAYMENT_METHOD]**. საბანკო ანგარიში: **[BANK_ACCOUNT]**. ზეგანაკვეთური სამუშაო ანაზღაურდება კანონმდებლობის შესაბამისად.

6. **შვებულება**
დასაქმებულს ეძლევა კანონმდებლობით გათვალისწინებული ანაზღაურებადი და ანაზღაურების გარეშე შვებულება.

7. **ხელშეკრულების შეწყვეტა**
ხელშეკრულების შეწყვეტა ხდება საქართველოს შრომის კოდექსის 47-ე და 48-ე მუხლებით დადგენილი საფუძვლებითა და წესით, წინასწარი წერილობითი შეტყობინებით. საბოლოო ანგარიშსწორება ხდება შეწყვეტიდან არაუგვიანეს 7 კალენდარული დღისა.

8. **დასკვნითი დებულებები**
ხელშეკრულება შედგენილია 2 ეგზემპლარად, თანაბარი იურიდიული ძალით.

დამსაქმებელი: ____________ **[EMPLOYER]**
დასაქმებული: ____________ **[EMPLOYEE]**
```

### 3. Power of attorney (`power-of-attorney`)
**Legal basis:** Civil Code of Georgia, Art. 107 (granting authority — no
special form required unless the law demands one, e.g. real-estate/court
matters), 108 (revocation must be communicated to third parties), 109
(grounds for termination of authority: expiry, refusal, revocation, death,
performance), 110 (agent must return the POA document once authority ends).

```
მინდობილობა

ქ. **[CITY]**, **[DOC_DATE]**

მე, **[PRINCIPAL]**, პ/ნ **[PRINCIPAL_ID]**, რეგისტრირებული მისამართზე: [PRINCIPAL_ADDRESS] (შემდგომში — „მინდობელი"), ვანიჭებ **[AGENT]**-ს, პ/ნ **[AGENT_ID]**, რეგისტრირებული მისამართზე: [AGENT_ADDRESS] (შემდგომში — „მინდობილი პირი"), წარმომადგენლობით უფლებამოსილებას შემდეგი მოქმედებების განსახორციელებლად:

**მინდობის ფარგლები:**
[SCOPE]

მინდობილი პირი ვალდებულია იმოქმედოს მინდობელის ინტერესების შესაბამისად, ამ მინდობილობის ფარგლებში.

უფლებამოსილება წყდება მისი ვადის გასვლით (თუ ვადა განისაზღვრა), მინდობილი პირის უარით, მინდობელის მიერ გაუქმებით, მინდობელის გარდაცვალებით ან დავალების შესრულებით. თუ ვადა არ არის მითითებული, მინდობილობა მოქმედებს გაუქმებამდე. უფლებამოსილების გაუქმებისას მინდობილი პირი ვალდებულია დაუბრუნოს მინდობელს მინდობილობის საბუთი.

შენიშვნა: კანონმდებლობით განსაზღვრულ შემთხვევებში (მაგ. უძრავი ქონების განკარგვა, სასამართლო წარმომადგენლობა) მინდობილობა საჭიროებს სანოტარო დამოწმებას.

მინდობელი: ____________ **[PRINCIPAL]**
```

### 4. Termination notice (`termination-notice`)
**Legal basis:** Labor Code of Georgia, Art. 44 (final settlement within 7
days), 47 (termination grounds), 48 (notice period + compensation, right to
demand written justification and to appeal to court).

```
შეტყობინება შრომითი ხელშეკრულების შეწყვეტის შესახებ

ქ. **[CITY]**, **[DOC_DATE]**

დამსაქმებელი: **[EMPLOYER]**
დასაქმებული: **[EMPLOYEE]**, პ/ნ **[EMPLOYEE_ID]**, მისამართი: [EMPLOYEE_ADDRESS]

წინამდებარე შეტყობინებით გაცნობებთ, რომ თქვენთან დადებული შრომითი ხელშეკრულება წყდება საქართველოს შრომის კოდექსის 47-ე მუხლის შესაბამისად, შემდეგი საფუძვლით:

**შეწყვეტის საფუძველი:** [REASON]

**შრომითი ურთიერთობის ბოლო დღე:** **[LAST_DAY]**

შეტყობინება გამოგზავნილია საქართველოს შრომის კოდექსის 48-ე მუხლით დადგენილი წინასწარი გაფრთხილების ვადის დაცვით. კანონით გათვალისწინებულ შემთხვევებში დასაქმებულს ეკუთვნის შესაბამისი კომპენსაცია.

საბოლოო ანგარიშსწორება განხორციელდება შრომითი ურთიერთობის შეწყვეტიდან არაუგვიანეს 7 კალენდარული დღისა (შრომის კოდექსის 44-ე მუხლი).

დასაქმებულს უფლება აქვს, კანონმდებლობით დადგენილი წესით მოითხოვოს შეწყვეტის საფუძვლის წერილობითი დასაბუთება და გაასაჩივროს გადაწყვეტილება სასამართლოში.

____________ **[EMPLOYER]**
```

---

**Not legal advice / review flag:** this text is drafted by an AI assistant
from the primary statute text, not by a licensed Georgian attorney. It
should get a human legal review pass before going live, same as any other
user-facing legal content on the site.

## Placeholder → form field mapping

| Template | Placeholder | `QUESTION_SCHEMAS` key |
|---|---|---|
| rental-agreement | LANDLORD / LANDLORD_ID / LANDLORD_ADDRESS / LANDLORD_PHONE | landlord / landlordId / landlordAddress / landlordPhone |
| | TENANT / TENANT_ID / TENANT_ADDRESS / TENANT_PHONE | tenant / tenantId / tenantAddress / tenantPhone |
| | PROPERTY_ADDRESS / RENT / PAYMENT_METHOD / BANK_ACCOUNT / DURATION | address / rent / paymentMethod / bankAccount / duration |
| employment-contract | EMPLOYER / EMPLOYER_ID / EMPLOYER_ADDRESS | employer / employerId / employerAddress |
| | EMPLOYEE / EMPLOYEE_ID / EMPLOYEE_ADDRESS | employee / employeeId / employeeAddress |
| | POSITION / SALARY / SALARY_PAYMENT_METHOD / BANK_ACCOUNT / START_DATE | position / salary / salaryPaymentMethod / bankAccount / startDate |
| power-of-attorney | PRINCIPAL / PRINCIPAL_ID / PRINCIPAL_ADDRESS | principal / idNumber / principalAddress |
| | AGENT / AGENT_ID / AGENT_ADDRESS / SCOPE | agent / agentId / agentAddress / scope |
| termination-notice | EMPLOYER / EMPLOYEE / EMPLOYEE_ID / EMPLOYEE_ADDRESS | employer / employee / employeeId / employeeAddress |
| | REASON / LAST_DAY | reason / lastDay |
| all | CITY / DOC_DATE | city / docDate (COMMON_FIELDS) |

Optional fields with no value supplied (phone, bank account) render as `—`
rather than an empty string or a visible bracket.

## Out of scope for this change
- Actual numeric quota values per plan (user sets these later).
- Legal review/sign-off of the drafted template text (flagged above).
- A history page specific to templates (reuses the existing generated-doc
  history view via the new `source` field).

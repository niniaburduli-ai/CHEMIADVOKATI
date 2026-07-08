/**
 * Static document templates — pure string interpolation, zero AI calls.
 * Legal-basis citations are hardcoded per template (verified against the live
 * text at matsne.gov.ge on 2026-07-08 — see the design spec for sourcing).
 * Structure (preamble, force-majeure/dispute clauses, requisites block) is
 * modeled on real Georgian market contracts, not just statute text — see spec.
 */

export const TEMPLATE_TYPES = [
  "rental-agreement",
  "employment-contract",
  "power-of-attorney",
  "termination-notice",
] as const;

export type TemplateType = (typeof TEMPLATE_TYPES)[number];

type TemplateDef = { body: string; legalBasis: string };

const RENTAL_BODY = `ბინის ქირავნობის ხელშეკრულება

ქ. **[CITY]**                                                                    **[DOC_DATE]**

ერთის მხრივ, **[LANDLORD]** (პ/ნ **[LANDLORD_ID]**, მისამართი: [LANDLORD_ADDRESS], ტელ: [LANDLORD_PHONE]) (შემდგომში — „გამქირავებელი“) და მეორეს მხრივ, **[TENANT]** (პ/ნ **[TENANT_ID]**, მისამართი: [TENANT_ADDRESS], ტელ: [TENANT_PHONE]) (შემდგომში — „დამქირავებელი“, ერთობლივად — „მხარეები“), ვდებთ წინამდებარე ხელშეკრულებას შემდეგზე:

**1. ხელშეკრულების საგანი**
გამქირავებელი გადასცემს დამქირავებელს სარგებლობაში საცხოვრებელ ფართს მისამართზე: **[PROPERTY_ADDRESS]** (შემდგომში — „ფართი“), ხოლო დამქირავებელი იღებს ვალდებულებას გადაუხადოს ქირა წინამდებარე ხელშეკრულებით დადგენილი წესით.

**2. ხელშეკრულების ვადა**
ხელშეკრულება ძალაშია **[DURATION]**-ის განმავლობაში, **[DOC_DATE]**-დან.

**3. ქირა და გადახდის წესი**
3.1. ყოველთვიური ქირა შეადგენს **[RENT]**-ს.
3.2. გადახდის მეთოდი: **[PAYMENT_METHOD]**. საბანკო ანგარიში: **[BANK_ACCOUNT]**.
3.3. ქირა გადაიხდება ყოველი საანგარიშო პერიოდის დასრულებისას, თუ მხარეები სხვაგვარად არ შეთანხმდებიან.
3.4. დამქირავებელს შეიძლება დაეკისროს ვალდებულების უზრუნველყოფის თანხის (დეპოზიტის) წარდგენა, რომელიც არ აღემატება ერთი თვის ქირის სამმაგ ოდენობას; წინასწარ გადახდილ თანხას ერიცხება კანონით დადგენილი პროცენტი და უბრუნდება დამქირავებელს ხელშეკრულების დასრულებისას.

**4. მხარეთა უფლება-მოვალეობები**
4.1. გამქირავებელი გადასცემს ფართს გამართულ, დანიშნულებისამებრ გამოსაყენებელ მდგომარეობაში.
4.2. დამქირავებელი იყენებს ფართს დანიშნულებისამებრ და ზრუნავს მის შენარჩუნებაზე.
4.3. ხელშეკრულების შეწყვეტისას დამქირავებელი აბრუნებს ფართს იმ მდგომარეობაში, რომელშიც მიიღო, ნორმალური ცვეთის გათვალისწინებით.

**5. ხელშეკრულების ვადამდე შეწყვეტა**
5.1. თუ დამქირავებელი არ იხდის ქირას ზედიზედ სამი თვის განმავლობაში, გამქირავებელს უფლება აქვს მოშალოს ხელშეკრულება ვადამდე.
5.2. განუსაზღვრელი ვადის შემთხვევაში, ნებისმიერ მხარეს შეუძლია მოშალოს ხელშეკრულება წერილობითი შეტყობინებით, სამთვიანი ვადის დაცვით, თუ მხარეები სხვა ვადაზე არ შეთანხმდნენ.
5.3. ხელშეკრულების შეწყვეტა ფორმდება წერილობით.

**6. ფორს-მაჟორი**
მხარეები თავისუფლდებიან პასუხისმგებლობისგან, თუ ვალდებულების შეუსრულებლობა გამოწვეულია დაუძლეველი ძალის გარემოებით (სტიქიური უბედურება, ომი, ეპიდემია და სხვა), რომლის თავიდან აცილება მხარეთა გონივრულ კონტროლს აღემატება.

**7. დავების გადაწყვეტა**
ხელშეკრულებასთან დაკავშირებული დავები წყდება მოლაპარაკების გზით, ხოლო შეთანხმების მიუღწევლობისას — საქართველოს კანონმდებლობით დადგენილი წესით, სასამართლოში.

**8. დასკვნითი დებულებები**
ხელშეკრულება შედგენილია 2 ეგზემპლარად, თითოეული მხარისთვის თანაბარი იურიდიული ძალით.

**მხარეთა რეკვიზიტები**
გამქირავებელი: **[LANDLORD]**, პ/ნ [LANDLORD_ID], მის: [LANDLORD_ADDRESS], ტელ: [LANDLORD_PHONE]     ხელმოწერა: ____________
დამქირავებელი: **[TENANT]**, პ/ნ [TENANT_ID], მის: [TENANT_ADDRESS], ტელ: [TENANT_PHONE]     ხელმოწერა: ____________`;

const EMPLOYMENT_BODY = `შრომის ხელშეკრულება

ქ. **[CITY]**                                                                    **[DOC_DATE]**

ერთის მხრივ, **[EMPLOYER]** (ს/ნ **[EMPLOYER_ID]**, მისამართი: [EMPLOYER_ADDRESS]) (შემდგომში — „დამსაქმებელი“) და მეორეს მხრივ, **[EMPLOYEE]** (პ/ნ **[EMPLOYEE_ID]**, მისამართი: [EMPLOYEE_ADDRESS]) (შემდგომში — „დასაქმებული“, ერთობლივად — „მხარეები“), ვდებთ წინამდებარე ხელშეკრულებას შემდეგზე:

**1. ხელშეკრულების საგანი**
დამსაქმებელი დასაქმებულს იღებს **[POSITION]**-ის პოზიციაზე **[START_DATE]**-დან, ხოლო დასაქმებული თანხმობას აცხადებს შეასრულოს დაკისრებული სამუშაო წინამდებარე ხელშეკრულებით დადგენილი პირობების შესაბამისად.

**2. ხელშეკრულების ვადა**
ხელშეკრულება დადებულია განუსაზღვრელი ვადით, თუ მხარეები წერილობით სხვაგვარად არ შეთანხმდებიან.

**3. სამუშაო დრო და დასვენება**
სამუშაო დრო და დასვენების პერიოდები განისაზღვრება საქართველოს შრომის კოდექსისა და დამსაქმებლის შინაგანაწესის შესაბამისად (არსებობის შემთხვევაში).

**4. ანაზღაურება**
4.1. თანამდებობრივი სარგო შეადგენს **[SALARY]**-ს თვეში.
4.2. გადახდის მეთოდი: **[SALARY_PAYMENT_METHOD]**. საბანკო ანგარიში: **[BANK_ACCOUNT]**.
4.3. ზეგანაკვეთური სამუშაო ანაზღაურდება კანონმდებლობის შესაბამისად.

**5. მხარეთა უფლება-მოვალეობები**
5.1. დამსაქმებელი ვალდებულია დროულად გადაუხადოს დასაქმებულს ხელფასი და უზრუნველყოს უსაფრთხო სამუშაო გარემო.
5.2. დასაქმებული ვალდებულია ჯეროვნად და კეთილსინდისიერად შეასრულოს დაკისრებული მოვალეობები.
5.3. დასაქმებულს ეძლევა კანონმდებლობით გათვალისწინებული ანაზღაურებადი და ანაზღაურების გარეშე შვებულება.

**6. ხელშეკრულების შეწყვეტა**
ხელშეკრულების შეწყვეტა ხდება საქართველოს შრომის კოდექსის 47-ე და 48-ე მუხლებით დადგენილი საფუძვლებითა და წესით, წინასწარი წერილობითი შეტყობინებით. საბოლოო ანგარიშსწორება ხდება შეწყვეტიდან არაუგვიანეს 7 კალენდარული დღისა.

**7. დავების გადაწყვეტა**
შრომითი დავები წყდება მხარეთა მოლაპარაკებით, ხოლო შეთანხმების მიუღწევლობისას — სასამართლოში, საქართველოს კანონმდებლობით დადგენილი წესით.

**8. დასკვნითი დებულებები**
ხელშეკრულება შედგენილია 2 ეგზემპლარად, თანაბარი იურიდიული ძალით.

**მხარეთა რეკვიზიტები**
დამსაქმებელი: **[EMPLOYER]**, ს/ნ [EMPLOYER_ID], მის: [EMPLOYER_ADDRESS]     ხელმოწერა: ____________
დასაქმებული: **[EMPLOYEE]**, პ/ნ [EMPLOYEE_ID], მის: [EMPLOYEE_ADDRESS]     ხელმოწერა: ____________`;

const POWER_OF_ATTORNEY_BODY = `მინდობილობა

ქ. **[CITY]**                                                                    **[DOC_DATE]**

მე, **[PRINCIPAL]** (პ/ნ **[PRINCIPAL_ID]**, რეგისტრირებული მისამართზე: [PRINCIPAL_ADDRESS]) (შემდგომში — „მინდობელი“), ვანიჭებ **[AGENT]**-ს (პ/ნ **[AGENT_ID]**, რეგისტრირებული მისამართზე: [AGENT_ADDRESS]) (შემდგომში — „მინდობილი პირი“) წარმომადგენლობით უფლებამოსილებას შემდეგი მოქმედებების განსახორციელებლად:

**მინდობის ფარგლები:**
[SCOPE]

მინდობილი პირი ვალდებულია იმოქმედოს მინდობელის ინტერესების შესაბამისად, ამ მინდობილობის ფარგლების გადაცილების გარეშე.

**უფლებამოსილების შეწყვეტა:** უფლებამოსილება წყდება მისი ვადის გასვლით (თუ ვადა განისაზღვრა), მინდობილი პირის უარით, მინდობელის მიერ გაუქმებით, მინდობელის გარდაცვალებით ან დავალების შესრულებით. თუ ვადა არ არის მითითებული, მინდობილობა მოქმედებს გაუქმებამდე. უფლებამოსილების გაუქმებისას მინდობილი პირი ვალდებულია დაუბრუნოს მინდობელს მინდობილობის საბუთი.

**შენიშვნა:** კანონმდებლობით განსაზღვრულ შემთხვევებში (მაგ. უძრავი ქონების განკარგვა, სასამართლო წარმომადგენლობა) მინდობილობა საჭიროებს სანოტარო დამოწმებას.

მინდობელი: **[PRINCIPAL]**     ხელმოწერა: ____________`;

const TERMINATION_NOTICE_BODY = `შეტყობინება შრომითი ხელშეკრულების შეწყვეტის შესახებ

ქ. **[CITY]**                                                                    **[DOC_DATE]**

დამსაქმებელი: **[EMPLOYER]**
დასაქმებული: **[EMPLOYEE]**, პ/ნ **[EMPLOYEE_ID]**, მისამართი: [EMPLOYEE_ADDRESS]

წინამდებარე შეტყობინებით გაცნობებთ, რომ თქვენთან დადებული შრომითი ხელშეკრულება წყდება საქართველოს შრომის კოდექსის 47-ე მუხლის შესაბამისად, შემდეგი საფუძვლით:

**შეწყვეტის საფუძველი:** [REASON]

**შრომითი ურთიერთობის ბოლო დღე:** **[LAST_DAY]**

შეტყობინება გამოგზავნილია საქართველოს შრომის კოდექსის 48-ე მუხლით დადგენილი წინასწარი გაფრთხილების ვადის დაცვით. კანონით გათვალისწინებულ შემთხვევებში დასაქმებულს ეკუთვნის შესაბამისი კომპენსაცია.

საბოლოო ანგარიშსწორება განხორციელდება შრომითი ურთიერთობის შეწყვეტიდან არაუგვიანეს 7 კალენდარული დღისა (შრომის კოდექსის 44-ე მუხლი).

დასაქმებულს უფლება აქვს, კანონმდებლობით დადგენილი წესით მოითხოვოს შეწყვეტის საფუძვლის წერილობითი დასაბუთება და გაასაჩივროს გადაწყვეტილება სასამართლოში.

დამსაქმებელი: **[EMPLOYER]**     ხელმოწერა: ____________`;

const TEMPLATES: Record<TemplateType, TemplateDef> = {
  "rental-agreement": {
    body: RENTAL_BODY,
    legalBasis:
      "საქართველოს სამოქალაქო კოდექსი:\n- მუხლი 531\n- მუხლი 552\n- მუხლი 553\n- მუხლი 558\n- მუხლი 559\n- მუხლი 561\n- მუხლი 563\n- მუხლი 564",
  },
  "employment-contract": {
    body: EMPLOYMENT_BODY,
    legalBasis:
      "საქართველოს ორგანული კანონი „საქართველოს შრომის კოდექსი“:\n- მუხლი 14\n- მუხლი 44\n- მუხლი 47\n- მუხლი 48",
  },
  "power-of-attorney": {
    body: POWER_OF_ATTORNEY_BODY,
    legalBasis:
      "საქართველოს სამოქალაქო კოდექსი:\n- მუხლი 107\n- მუხლი 108\n- მუხლი 109\n- მუხლი 110",
  },
  "termination-notice": {
    body: TERMINATION_NOTICE_BODY,
    legalBasis:
      "საქართველოს ორგანული კანონი „საქართველოს შრომის კოდექსი“:\n- მუხლი 44\n- მუხლი 47\n- მუხლი 48",
  },
};

/**
 * Maps each template's form-field keys (from QUESTION_SCHEMAS /
 * COMMON_FIELDS in document-fields.ts) to the [PLACEHOLDER] tokens used in
 * that template's body text.
 */
const FIELD_MAP: Record<TemplateType, Record<string, string>> = {
  "rental-agreement": {
    landlord: "LANDLORD", landlordId: "LANDLORD_ID", landlordAddress: "LANDLORD_ADDRESS", landlordPhone: "LANDLORD_PHONE",
    tenant: "TENANT", tenantId: "TENANT_ID", tenantAddress: "TENANT_ADDRESS", tenantPhone: "TENANT_PHONE",
    address: "PROPERTY_ADDRESS", rent: "RENT", paymentMethod: "PAYMENT_METHOD", bankAccount: "BANK_ACCOUNT", duration: "DURATION",
    city: "CITY", docDate: "DOC_DATE",
  },
  "employment-contract": {
    employer: "EMPLOYER", employerId: "EMPLOYER_ID", employerAddress: "EMPLOYER_ADDRESS",
    employee: "EMPLOYEE", employeeId: "EMPLOYEE_ID", employeeAddress: "EMPLOYEE_ADDRESS",
    position: "POSITION", salary: "SALARY", salaryPaymentMethod: "SALARY_PAYMENT_METHOD", bankAccount: "BANK_ACCOUNT", startDate: "START_DATE",
    city: "CITY", docDate: "DOC_DATE",
  },
  "power-of-attorney": {
    principal: "PRINCIPAL", idNumber: "PRINCIPAL_ID", principalAddress: "PRINCIPAL_ADDRESS",
    agent: "AGENT", agentId: "AGENT_ID", agentAddress: "AGENT_ADDRESS", scope: "SCOPE",
    city: "CITY", docDate: "DOC_DATE",
  },
  "termination-notice": {
    employer: "EMPLOYER", employee: "EMPLOYEE", employeeId: "EMPLOYEE_ID", employeeAddress: "EMPLOYEE_ADDRESS",
    reason: "REASON", lastDay: "LAST_DAY",
    city: "CITY", docDate: "DOC_DATE",
  },
};

/** Replace every `[PLACEHOLDER]` token in `body` using `values` (keyed by placeholder name, not form key). Missing/blank values render as `—`. */
function fillTemplate(body: string, values: Record<string, string>): string {
  return body.replace(/\[([A-Z_]+)\]/g, (_match, key: string) => {
    const v = values[key]?.trim();
    return v ? v : "—";
  });
}

/**
 * Render a static template: map form answers (keyed by QUESTION_SCHEMAS
 * field key, e.g. "landlordPhone") to placeholder tokens, then interpolate.
 * Never calls any AI model.
 */
export function renderTemplate(
  type: TemplateType,
  answers: Record<string, string>
): { content: string; legalBasis: string } {
  const map = FIELD_MAP[type];
  const values: Record<string, string> = {};
  for (const [formKey, placeholder] of Object.entries(map)) {
    values[placeholder] = answers[formKey] ?? "";
  }
  const def = TEMPLATES[type];
  return { content: fillTemplate(def.body, values), legalBasis: def.legalBasis };
}

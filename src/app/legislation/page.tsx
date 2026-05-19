"use client";

import { useState } from "react";
import { Search, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type Doc = { id: string; code: string; article: string; title: string; tag: string };

const mockDocs: Doc[] = [
  { id: "1", code: "სამოქალაქო კოდექსი", article: "მუხლი 286", title: "უძრავი ნივთის ნასყიდობა", tag: "სამოქალაქო" },
  { id: "2", code: "შრომის კოდექსი", article: "მუხლი 37", title: "შრომითი ხელშეკრულების შეწყვეტა", tag: "შრომა" },
  { id: "3", code: "შრომის კოდექსი", article: "მუხლი 24", title: "სამუშაო დროის ხანგრძლივობა", tag: "შრომა" },
  { id: "4", code: "საგადასახადო კოდექსი", article: "მუხლი 79", title: "შემოსავლის გადასახადი", tag: "გადასახადი" },
  { id: "5", code: "სისხლის სამართლის კოდექსი", article: "მუხლი 177", title: "ქურდობა", tag: "სისხლის" },
  { id: "6", code: "სამოქალაქო კოდექსი", article: "მუხლი 1198", title: "ალიმენტი", tag: "ოჯახი" },
  { id: "7", code: "ადმინისტრაციული კოდექსი", article: "მუხლი 174", title: "მცირე ხულიგნობა", tag: "ადმინისტრაციული" },
  { id: "8", code: "სამოქალაქო კოდექსი", article: "მუხლი 531", title: "ქირავნობა", tag: "სამოქალაქო" },
];

const categories = ["ყველა", "სამოქალაქო", "შრომა", "სისხლის", "გადასახადი", "ოჯახი", "ადმინისტრაციული"];

export default function LegislationPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("ყველა");

  const filtered = mockDocs.filter((d) => {
    const matchCat = cat === "ყველა" || d.tag === cat;
    const matchQ =
      !q ||
      d.title.toLowerCase().includes(q.toLowerCase()) ||
      d.code.toLowerCase().includes(q.toLowerCase()) ||
      d.article.toLowerCase().includes(q.toLowerCase());
    return matchCat && matchQ;
  });

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">კანონმდებლობა</h1>
        <p className="text-muted-foreground mt-1">
          საქართველოს კოდექსები და მუხლები — მოძებნე, რომელიც გჭირდება.
        </p>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ძებნა: მუხლის ნომერი, კოდექსი, საკითხი..."
          className="pl-9"
        />
      </div>

      <Tabs value={cat} onValueChange={setCat} className="mb-6">
        <TabsList className="flex flex-wrap h-auto">
          {categories.map((c) => (
            <TabsTrigger key={c} value={c}>
              {c}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={cat} className="mt-4">
          <div className="grid gap-3 md:grid-cols-2">
            {filtered.map((d) => (
              <Card key={d.id} className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <BookOpen className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{d.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {d.code} — {d.article}
                      </div>
                      <Badge variant="secondary" className="mt-2 text-xs">
                        {d.tag}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-12">
              ვერ მოიძებნა შედეგი.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

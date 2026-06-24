"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, AlertTriangle } from "lucide-react";

export function AssistantPreview() {
  const [q, setQ] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    router.push(`/chat?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <section className="container mx-auto px-4 py-14 max-w-2xl">
      <div className="bg-white rounded-2xl shadow-sm border border-[#e0e0ff] p-8 flex flex-col gap-6">
        {/* Greeting */}
        <div className="flex flex-col gap-3 text-[#1a1a2e]">
          <p className="font-semibold text-base leading-relaxed">
            გამარჯობა! მე ვარ „ჩემი იურისტი&rdquo; — თქვენი პერსონალური ციფრული იურიდიული ასისტენტი.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">
            მე დაგეხმარებით სამართლებრივი საკითხების გარკვევაში მარტივი, გასაგები ენით, საქართველოს მოქმედი კანონმდებლობის საფუძველზე.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">
            უბრალოდ დამისვით კითხვა — და მე შევეცდები მოგცეთ მკაფიო და პრაქტიკული პასუხი.
          </p>
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-[#3730a3]">
            რით შემიძლია დაგეხმაროთ დღეს?
          </label>
          <div className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="დაწერეთ თქვენი შეკითხვა..."
              className="flex-1 rounded-xl border border-[#e0e0ff] bg-[#f7f7ff] px-4 py-3 text-sm text-[#1a1a2e] placeholder:text-gray-400 outline-none focus:border-[#6366f1] transition-colors"
            />
            <button
              type="submit"
              className="rounded-xl bg-[#4338ca] hover:bg-[#3730a3] text-white px-4 py-3 transition-colors flex items-center justify-center"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>

        {/* Disclaimer */}
        <div className="flex gap-3 bg-[#fffbeb] border border-[#fde68a] rounded-xl px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-[#d97706] shrink-0 mt-0.5" />
          <p className="text-xs text-[#92400e] leading-relaxed">
            გაფრთხილება: „პასუხი გენერირებულია ხელოვნური ინტელექტის მიერ და ეფუძნება მოქმედ კანონმდებლობას. ოფიციალური იურიდიული დასკვნისთვის მიმართეთ იურისტს.&rdquo;
          </p>
        </div>
      </div>
    </section>
  );
}

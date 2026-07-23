"use client";

import { useState } from "react";
import Link from "next/link";
import { Globe, Mail, MapPin, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type NavItem = {
  _id: string;
  href: string;
  label: string;
  isExternal?: boolean;
};

type LegalItem = {
  href: string;
  label: string;
};

export function MobileNavSheet({
  siteName,
  menuLabel,
  navItems,
  legalItems,
  navigationLabel,
  usefulInfoLabel,
  contactLabel,
  contactEmail,
  contactAddress,
}: {
  siteName: string;
  menuLabel: string;
  navItems: NavItem[];
  legalItems: LegalItem[];
  navigationLabel: string;
  usefulInfoLabel: string;
  contactLabel: string;
  contactEmail: string;
  contactAddress: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="ghost" size="icon-lg" className="text-foreground" aria-label={menuLabel} />}
      >
        <Menu className="h-7 w-7 text-gold" strokeWidth={2.5} />
      </SheetTrigger>
      <SheetContent side="left" className="bg-background">
        <SheetHeader>
          <SheetTitle className="text-gold">{siteName}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-6 px-4 pb-4 overflow-y-auto">
          <div>
            <p className="mb-2 px-3 text-sm font-bold text-foreground">{navigationLabel}</p>
            <nav className="flex flex-col gap-1">
              {navItems.map((n) => (
                <Link
                  key={n._id}
                  href={n.href}
                  target={n.isExternal ? "_blank" : undefined}
                  rel={n.isExternal ? "noopener noreferrer" : undefined}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-accent hover:text-foreground transition-colors"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <p className="mb-2 px-3 text-sm font-bold text-foreground">{usefulInfoLabel}</p>
            <nav className="flex flex-col gap-1">
              {legalItems.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-accent hover:text-foreground transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <p className="mb-2 px-3 text-sm font-bold text-foreground">{contactLabel}</p>
            <div className="flex flex-col gap-1.5 px-3 text-sm text-foreground/80">
              <a
                href="https://chemiiuristi.com"
                className="flex items-center gap-2 hover:text-foreground transition-colors"
              >
                <Globe className="h-3.5 w-3.5 shrink-0 text-gold" />
                chemiiuristi.com
              </a>
              <a
                href={`mailto:${contactEmail}`}
                className="flex items-center gap-2 hover:text-foreground transition-colors"
              >
                <Mail className="h-3.5 w-3.5 shrink-0 text-gold" />
                {contactEmail}
              </a>
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-gold" />
                {contactAddress}
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

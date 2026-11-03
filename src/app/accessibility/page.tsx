import type { Metadata } from "next";
import { LegalShell } from "@/components/LegalShell";
import { CONTACT_EMAIL } from "@/components/SiteFooter";

export const metadata: Metadata = { title: "Accessibility · linksh.it" };

export default function Accessibility() {
  const mail = <a href={`mailto:${CONTACT_EMAIL}?subject=Accessibility`}>{CONTACT_EMAIL}</a>;
  return (
    <LegalShell title="Accessibility" updated="November 3, 2026">
      <p>
        We want everyone to be able to use linksh.it, whether they&apos;re building a page or visiting one. We aim to meet the Web
        Content Accessibility Guidelines (WCAG) 2.1 at level AA.
      </p>

      <h2>What we do</h2>
      <ul>
        <li>Check our pages with automated accessibility tests and by hand, including on phones.</li>
        <li>Keep text readable against its background, label every form field, and mark up pages so screen readers can find their way around.</li>
        <li>Let you zoom in anywhere, and respect your device&apos;s &ldquo;reduce motion&rdquo; setting.</li>
      </ul>

      <h2>What we can&apos;t fully control</h2>
      <p>
        Creators choose their own colors, photos and link text, and some pages include players from Spotify, YouTube and others.
        We pick accessible defaults and nudge creators toward readable choices, but a creator&apos;s own design may not always meet
        every guideline.
      </p>

      <h2>Tell us if something doesn&apos;t work</h2>
      <p>
        If you hit a barrier anywhere on linksh.it, email {mail} and tell us the page and what happened. We&apos;ll reply within
        5 business days and work on a fix, and if you need something from a page in another format in the meantime, we&apos;ll help.
      </p>
    </LegalShell>
  );
}

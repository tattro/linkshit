import Link from "next/link";
import type { Metadata } from "next";
import { LegalShell } from "@/components/LegalShell";
import { CONTACT_EMAIL } from "@/components/SiteFooter";

export const metadata: Metadata = { title: "Contact · linksh.it" };

export default function Contact() {
  return (
    <LegalShell title="Contact us">
      <p>
        Questions, bugs, feature ideas, or just want to tell us the name is stupid? Email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. A real human reads it.
      </p>
      <h2>Report a page or link</h2>
      <p>
        If a linksh.it page is spammy, phishing, illegal, impersonating someone, or links to something nasty, email{" "}
        <a href={`mailto:${CONTACT_EMAIL}?subject=Report`}>{CONTACT_EMAIL}</a> with the page address (like
        linksh.it/somebody) and what&apos;s wrong. We look at every report.
      </p>
      <h2>Copyright or trademark complaints</h2>
      <p>
        Send the page address, what you own, and how to reach you to{" "}
        <a href={`mailto:${CONTACT_EMAIL}?subject=Copyright%20or%20trademark`}>{CONTACT_EMAIL}</a>. We&apos;ll remove
        infringing content when the claim checks out.
      </p>
      <h2>Your data</h2>
      <p>
        Want a copy of your data, or your account deleted? Email us from the address on your account and we&apos;ll
        sort it out. See the <Link href="/privacy">Privacy Policy</Link> for details.
      </p>
    </LegalShell>
  );
}

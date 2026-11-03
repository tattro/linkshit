import type { Metadata } from "next";
import { LegalShell } from "@/components/LegalShell";
import { CONTACT_EMAIL } from "@/components/SiteFooter";

export const metadata: Metadata = { title: "Terms of Service · linksh.it" };

export default function Terms() {
  return (
    <LegalShell title="Terms of Service" updated="November 1, 2026">
      <p>
        These terms are the deal between you and linksh.it (&ldquo;we&rdquo;, &ldquo;us&rdquo;), a brand of Vyamp, operated by Rainbow SEO LLC of Tucson, Arizona, when you use the site.
        By creating an account or using linksh.it, you agree to them. If you don&apos;t agree, please don&apos;t use it.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You need to be at least 13 years old, and old enough to agree to these terms where you live.</li>
        <li>Give us a real email address and keep your password to yourself. You&apos;re responsible for what happens on your account.</li>
        <li>Handles are first come, first served, but you don&apos;t own them. We may reclaim a handle that impersonates someone, infringes a trademark, or sits unused for a long time.</li>
      </ul>

      <h2>Your content</h2>
      <p>
        You own what you put on your page. You give us permission to host, display and share it as needed to run
        linksh.it, for example showing your page to visitors and generating preview images for social media. You&apos;re
        responsible for making sure you have the right to post it.
      </p>

      <h2>Don&apos;t be that guy</h2>
      <p>You agree not to use linksh.it to:</p>
      <ul>
        <li>Break the law, or link to illegal content.</li>
        <li>Phish, scam, spread malware, or send spam.</li>
        <li>Impersonate someone or mislead people about who you are.</li>
        <li>Harass, threaten, or promote violence or hate against anyone.</li>
        <li>Share sexual content involving minors, or anyone&apos;s private info without consent.</li>
        <li>Infringe someone else&apos;s copyright, trademark, or other rights.</li>
        <li>Mess with the service, for example by scraping it heavily, overloading it, or getting around rate limits.</li>
      </ul>
      <p>
        We can remove content, block links, or suspend accounts that break these rules, with or without notice. Toilet
        humor is fine. Actual harm is not.
      </p>

      <h2>The service</h2>
      <p>
        linksh.it is free and provided &ldquo;as is&rdquo;. We work hard to keep it running, but we can&apos;t promise it
        will always be available, error free, or that your data will never be lost. Keep your own copy of anything
        important. We may change or discontinue features at any time.
      </p>

      <h2>Liability</h2>
      <p>
        To the maximum extent the law allows, linksh.it isn&apos;t liable for indirect, incidental, or consequential
        damages, or for anything on the websites people link to. Our total liability for any claim is limited to the
        amount you paid us in the past 12 months, which, for a free service, is zero.
      </p>

      <h2>Ending things</h2>
      <p>
        You can stop using linksh.it at any time and ask us to delete your account. We may suspend or end your account
        if you break these terms.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms. If the changes are meaningful, we&apos;ll update the date at the top and let account
        holders know. Using linksh.it after that means you accept the new terms.
      </p>

      <h2>Contact</h2>
      <p>Questions about these terms? <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
    </LegalShell>
  );
}

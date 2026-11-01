import type { Metadata } from "next";
import { LegalShell } from "@/components/LegalShell";
import { CONTACT_EMAIL } from "@/components/SiteFooter";

export const metadata: Metadata = { title: "Privacy Policy · linksh.it" };

export default function Privacy() {
  return (
    <LegalShell title="Privacy Policy" updated="November 1, 2026">
      <p>
        This policy explains what linksh.it (&ldquo;we&rdquo;, &ldquo;us&rdquo;) collects, why, and what you can do about
        it. Short version: we collect what we need to run your page, we don&apos;t sell anything, and we don&apos;t run ads.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account info:</strong> your email address and a hashed password (we never see or store the actual password).</li>
        <li><strong>Your page:</strong> handle, display name, bio, profile photo, links, social profiles, and style settings. This is public by design.</li>
        <li><strong>Analytics for your page:</strong> when someone views your page or clicks a link, we record the time, the referring website&apos;s domain, and an approximate country. We don&apos;t store visitors&apos; names or full IP addresses in analytics.</li>
        <li><strong>Security data:</strong> IP addresses are used briefly for rate limiting and spam prevention, and to avoid counting the same view twice.</li>
      </ul>

      <h2>Cookies</h2>
      <p>
        We use one cookie to keep you logged in. That&apos;s it. No advertising or third-party tracking cookies.
      </p>

      <h2>How we use it</h2>
      <ul>
        <li>To run your account and show your page.</li>
        <li>To send account emails, like verifying your address or resetting your password.</li>
        <li>To show you your page&apos;s analytics.</li>
        <li>To keep the service safe, including blocking spam, abuse, and harmful links.</li>
      </ul>

      <h2>Who we share it with</h2>
      <p>We don&apos;t sell your data. We use a few service providers to run linksh.it:</p>
      <ul>
        <li>Vercel (hosting)</li>
        <li>Neon (database)</li>
        <li>Resend (sending account emails)</li>
        <li>ImprovMX (receiving email sent to us)</li>
        <li>Google Safe Browsing (checking links for malware or phishing, when enabled)</li>
      </ul>
      <p>We may also share information if the law requires it, or to protect people from harm.</p>

      <h2>How long we keep it</h2>
      <p>
        We keep your account info for as long as your account exists. When you delete your account, your profile, links
        and analytics are deleted with it. Backups may take a little while to roll over.
      </p>

      <h2>Your rights</h2>
      <p>
        You can see and edit most of your info in your dashboard. You can also ask us for a copy of your data, to correct
        it, or to delete your account, by emailing <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from the
        address on your account. Depending on where you live (for example the EU or California), you may have
        additional rights, and we&apos;ll honor them.
      </p>

      <h2>Kids</h2>
      <p>linksh.it isn&apos;t for anyone under 13, and we don&apos;t knowingly collect data from children.</p>

      <h2>Changes</h2>
      <p>If we change this policy in a meaningful way, we&apos;ll update the date at the top and let account holders know.</p>

      <h2>Contact</h2>
      <p>Questions? <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
    </LegalShell>
  );
}

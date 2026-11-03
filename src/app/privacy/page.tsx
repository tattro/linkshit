import type { Metadata } from "next";
import { LegalShell } from "@/components/LegalShell";
import { CONTACT_EMAIL } from "@/components/SiteFooter";

export const metadata: Metadata = { title: "Privacy Policy · linksh.it" };

export default function Privacy() {
  const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;
  return (
    <LegalShell title="Privacy Policy" updated="November 3, 2026">
      <p>
        This policy explains what linksh.it (&ldquo;we&rdquo;, &ldquo;us&rdquo;) collects, why, and what you can do about
        it. Short version: we collect what we need to run your page, we don&apos;t sell or share your personal data for
        advertising, and you can take your data or delete it whenever you want.
      </p>
      <p>
        linksh.it is responsible for (the &ldquo;controller&rdquo; of) the personal data described here. You can reach us at {mail}.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account info:</strong> your email address and a hashed password (we never see or store the actual password), whether you confirmed your email, and whether you asked for tips and news.</li>
        <li><strong>Your page:</strong> handle, display name, bio, profile photo, links, social profiles, style settings, and the creator type you pick (like musician or podcaster). Your page is public by design.</li>
        <li><strong>Analytics for your page:</strong> when someone views your page or clicks a link, we record the time, the referring website&apos;s domain, the device type, and an approximate country. We don&apos;t store visitors&apos; names, cookies or IP addresses in analytics.</li>
        <li><strong>Messages and signups from visitors:</strong> if a page has a contact form or email signup box, we store what visitors send (their email, and for messages their name and message) so the page owner can read it. Contact messages are also emailed to the page owner. Anonymous Q&amp;A questions are stored without any name, email or IP address, and only appear on the page if the owner answers them.</li>
        <li><strong>Marketplace:</strong> if you turn on brand deals, we record which offers you add and the clicks they get, so we can work out payouts.</li>
        <li><strong>Security data:</strong> IP addresses are used briefly for rate limiting and spam prevention, and to avoid counting the same view twice. They aren&apos;t kept with your analytics.</li>
      </ul>

      <h2>Why we use it (and our legal basis)</h2>
      <ul>
        <li><strong>To run your account and show your page</strong>, send account emails (confirming your address, password resets, your stats email), and show you your analytics. We need this to provide the service you signed up for (contract).</li>
        <li><strong>To keep linksh.it safe</strong>, including blocking spam, abuse and harmful links (legitimate interests).</li>
        <li><strong>To understand and improve linksh.it</strong>, for example how many musicians or podcasters use it and which features get used (legitimate interests). We look at this in combined form.</li>
        <li><strong>To send you tips and news</strong>, only if you ticked the box and confirmed your email (consent). You can turn it off in Settings or with the unsubscribe link in any of those emails.</li>
        <li><strong>To meet legal obligations</strong>, like responding to valid legal requests (legal obligation).</li>
      </ul>

      <h2 id="cookies">Cookies</h2>
      <p>
        linksh.it itself only uses cookies it needs to work: one keeps you logged in, one remembers a code you typed to open a locked
        page or link, one remembers dark mode in your dashboard, and one remembers your answer about tracking (below). We set no advertising cookies.
      </p>
      <p>
        Some creators add their own Meta, Google Analytics or TikTok tracking to their page. That tracking only turns on if you tap
        &ldquo;Allow&rdquo; when the page asks. If your browser sends a Global Privacy Control signal, we treat it as &ldquo;No thanks&rdquo;
        and don&apos;t ask. When allowed, those companies process data under their own privacy policies, and the creator decides what
        they do with it. Music and video players on a page (like Spotify or YouTube) come from those services; YouTube videos use
        YouTube&apos;s privacy-enhanced mode.
      </p>
      <p>We don&apos;t respond to the older &ldquo;Do Not Track&rdquo; browser setting, but we do honor Global Privacy Control as described above.</p>

      <h2>Who we share it with</h2>
      <p>
        We don&apos;t sell your personal data, and we don&apos;t share it for targeted advertising. We use a few service providers who
        process data for us under contract:
      </p>
      <ul>
        <li>Vercel (hosting)</li>
        <li>Neon (database)</li>
        <li>Resend (sending emails)</li>
        <li>ImprovMX (receiving email sent to us)</li>
        <li>Google Safe Browsing (checking links for malware or phishing)</li>
      </ul>
      <p>
        We may publish or share combined statistics, like the share of pages run by musicians or average payouts by creator type, that
        can&apos;t identify any person or advertiser. We may also share information if the law requires it, to protect people from harm,
        or as part of a merger or sale of linksh.it (and we&apos;d tell you first).
      </p>

      <h2>Page owners and their visitors</h2>
      <p>
        If you sign up to a creator&apos;s email list or message them through their page, that creator decides how to use your email or
        message, and we store it for them. To get off a creator&apos;s list, contact them, or email us and we&apos;ll remove you.
      </p>

      <h2>Where your data lives</h2>
      <p>
        Our providers run servers in the United States. If you&apos;re in the EU, UK or elsewhere, your data is transferred to the US under
        the safeguards those providers offer, such as the EU-US Data Privacy Framework or Standard Contractual Clauses.
      </p>

      <h2>How long we keep it</h2>
      <ul>
        <li>Account and page data: for as long as your account exists.</li>
        <li>When you delete your account, your profile, links, analytics, subscribers and messages are deleted right away. Encrypted backups roll over within 14 days.</li>
        <li>Security data like IP addresses used for rate limits: about a day.</li>
      </ul>

      <h2>Your rights and choices</h2>
      <ul>
        <li><strong>See and download your data:</strong> most of it is in your dashboard, and Settings &rarr; Import &amp; backup downloads your page. Email us for a full copy.</li>
        <li><strong>Correct it:</strong> edit it in your dashboard, or email us.</li>
        <li><strong>Delete it:</strong> Settings &rarr; Delete account removes everything at once.</li>
        <li><strong>Object or withdraw consent:</strong> turn off tips and news or the stats email in Settings at any time.</li>
        <li><strong>Opt out of sale or sharing:</strong> we don&apos;t sell or share personal data, so there&apos;s nothing to opt out of. We still honor Global Privacy Control.</li>
      </ul>
      <p>
        Email {mail} for anything else. We&apos;ll answer within 30 days (45 for California requests). You can also have someone act for
        you, and we may ask you to confirm it&apos;s really you, usually by writing from the email on your account. We won&apos;t treat you
        differently for using any of these rights.
      </p>
      <p>
        <strong>EU and UK:</strong> you also have the right to restrict how we use your data, to data portability, and to complain to your
        local data protection authority.
      </p>
      <p>
        <strong>California:</strong> in the last 12 months we collected the categories listed under &ldquo;What we collect&rdquo;
        (identifiers like email, account details, internet activity on linksh.it pages, and approximate location), from you and from
        your page&apos;s visitors, for the reasons listed above. We didn&apos;t sell or share any of it, and we don&apos;t use sensitive
        personal information to infer anything about you.
      </p>

      <h2>Kids</h2>
      <p>linksh.it isn&apos;t for anyone under 13 (under 16 in the EU and UK), and we don&apos;t knowingly collect data from children. If you think a child has an account, email us and we&apos;ll delete it.</p>

      <h2>Changes</h2>
      <p>If we change this policy in a meaningful way, we&apos;ll update the date at the top and let account holders know by email.</p>

      <h2>Contact</h2>
      <p>Questions or requests? {mail}.</p>
    </LegalShell>
  );
}

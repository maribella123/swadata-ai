import type { Metadata } from "next";
import { LegalPage } from "@/components/site/page-hero";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <LegalPage eyebrow="Privacy policy" title="How we handle personal information" updated="November 2026">
      <p>
        AfriLang Research is designed to support compliance with South Africa&apos;s Protection of Personal Information Act, 2013
        (POPIA). This policy explains what personal information we process, why, and the rights you have. It should be reviewed
        by qualified legal counsel before production launch.
      </p>
      <h2>1. Information we collect</h2>
      <ul>
        <li><strong>Account information:</strong> email address (stored only in our authentication system), display name, and optional affiliation, region and short bio.</li>
        <li><strong>Language profile:</strong> languages and varieties you choose and your proficiency.</li>
        <li><strong>Contributions:</strong> text, documents, audio recordings, translations, conversations and cultural knowledge you submit, with the metadata and permissions you provide.</li>
        <li><strong>Speaker metadata (optional):</strong> a pseudonym, and optionally an age band and gender. We never ask for ID numbers, addresses or phone numbers.</li>
        <li><strong>Consent records:</strong> what you agreed to, which policy version, and when.</li>
        <li><strong>Security data:</strong> authentication logs and a one-way hash of your IP address for rate limiting. We do not store raw IP addresses in our application database.</li>
      </ul>
      <h2>2. Purposes and lawful basis</h2>
      <p>
        We process personal information with your consent and to provide the platform you sign up for. Each contribution records
        separate permissions for <strong>data collection</strong>, <strong>research use</strong>, <strong>public dataset publication</strong>,
        <strong> AI model training</strong> and <strong>commercial AI applications</strong>. We only use a contribution for the purposes you
        permitted.
      </p>
      <h2>3. Voice recordings</h2>
      <p>
        A voice can identify a person. Recordings require explicit recording consent and are stored in private storage. Speaker
        identity is replaced with a pseudonym you choose. Recordings are included in restricted-access speech datasets only where
        you have granted AI training permission.
      </p>
      <h2>4. Sharing</h2>
      <p>
        Reviewers see contributions they review. Researchers only receive data in dataset releases, which exclude account details
        and include only items whose permissions allow it. We use Supabase (database, authentication, storage), Vercel (web
        hosting) and Render (processing) as operators bound by data processing terms. We do not sell personal information.
      </p>
      <h2>5. Retention</h2>
      <p>
        Accounts are kept while active. Rejected contributions are reviewed for deletion after a retention period set by our data
        governance policy (currently 365 days). Data already released in a published dataset version cannot be recalled from
        copies others have downloaded, but will be excluded from future releases if you withdraw permission.
      </p>
      <h2>6. Your rights</h2>
      <ul>
        <li>Access the personal information we hold about you.</li>
        <li>Correct or update your profile at any time from your portal.</li>
        <li>Change or withdraw the permissions on any of your contributions.</li>
        <li>Request deletion of your account and personal information.</li>
        <li>Object to processing and lodge a complaint with the Information Regulator (South Africa).</li>
      </ul>
      <p>Use the <a href="/contact?topic=privacy">contact form</a> (topic: Privacy / POPIA request) to exercise these rights.</p>
      <h2>7. Security</h2>
      <p>
        We use encrypted connections (HTTPS), role-based access control enforced in the database with Row Level Security,
        private file storage, audit logging of sensitive actions, upload validation and rate limiting.
      </p>
      <h2>8. Children</h2>
      <p>Contributors must be 18 or older, or contribute through a school or organisation that has obtained parental consent.</p>
    </LegalPage>
  );
}

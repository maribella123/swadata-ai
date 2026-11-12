import type { Metadata } from "next";
import { LegalPage } from "@/components/site/page-hero";

export const metadata: Metadata = { title: "Terms and conditions" };

export default function TermsPage() {
  return (
    <LegalPage eyebrow="Terms and conditions" title="Terms of use" updated="November 2026">
      <p>These terms govern your use of AfriLang Research. By creating an account you agree to them. They should be reviewed by legal counsel before production launch.</p>
      <h2>1. Your contributions</h2>
      <ul>
        <li>You keep ownership of what you contribute. You grant AfriLang Research a licence to store, process and use each contribution <strong>only for the purposes you permit</strong> on that contribution.</li>
        <li>You confirm that you created the material or have the right to share it, and that it does not include other people&apos;s personal information without their consent.</li>
        <li>For previously published material you must accurately describe its copyright status. Copyrighted material is never included in public datasets without verified permission from the rights holder.</li>
      </ul>
      <h2>2. Acceptable use</h2>
      <ul>
        <li>No hateful, abusive, sexually explicit or unlawful content.</li>
        <li>No machine-generated text or synthetic speech presented as authentic human language data.</li>
        <li>No attempts to access data or functions beyond your role, or to disrupt the service.</li>
      </ul>
      <h2>3. Review and moderation</h2>
      <p>Reviewers may approve, reject, correct or request changes to submissions. Corrections are stored as new versions; your original is preserved. We may remove content that breaches these terms.</p>
      <h2>4. Datasets</h2>
      <p>Dataset users must comply with each dataset&apos;s licence and access conditions, must not attempt to re-identify speakers or contributors, and must cite AfriLang Research contributors.</p>
      <h2>5. Recognition</h2>
      <p>Contributors may opt in to public recognition. Contributing is voluntary and unpaid unless a separate written agreement says otherwise.</p>
      <h2>6. Liability</h2>
      <p>The platform is provided on an &quot;as is&quot; basis. To the extent permitted by law, AfriLang Research is not liable for indirect losses arising from use of the platform.</p>
      <h2>7. Changes</h2>
      <p>We will notify you of material changes. Consent records reference the policy version you accepted.</p>
      <h2>8. Governing law</h2>
      <p>These terms are governed by the laws of the Republic of South Africa.</p>
    </LegalPage>
  );
}

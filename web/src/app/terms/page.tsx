import Link from "next/link";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-white">
      {/* Simple header */}
      <header className="border-b bg-white">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hyah-logo.png" alt="Hyah AI" className="h-10 w-auto cursor-pointer" />
          </Link>
          <Link href="/" className="text-sm text-[var(--color-primary)] hover:underline">
            Back to Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto max-w-4xl px-6 py-12">
        <h1 className="mb-8 text-4xl font-bold text-[var(--color-text)]">Terms of Service</h1>
        <p className="mb-4 text-sm text-[var(--color-text-muted)]">Effective Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <div className="prose prose-lg max-w-none">
          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">1. Agreement to Terms</h2>
            <p className="mb-4">
              By accessing or using the services provided by Hyah! AI, Inc. ("Company," "we," "us," or "our"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these terms, you do not have permission to access our services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">2. Description of Services</h2>
            <p className="mb-4">
              Hyah! AI provides an AI-powered outsourcing platform that connects businesses with AI-assisted services and human advisors to complete various projects and tasks. Our services include but are not limited to:
            </p>
            <ul className="mb-4 list-disc pl-6">
              <li>AI-powered task automation and execution</li>
              <li>Project scoping and management</li>
              <li>Access to AI tools and platforms</li>
              <li>Human advisor consultation and oversight</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">3. User Accounts</h2>
            <h3 className="mb-2 text-xl font-semibold">Account Creation</h3>
            <p className="mb-4">
              To use our services, you must create an account. You agree to:
            </p>
            <ul className="mb-4 list-disc pl-6">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Promptly update any changes to your information</li>
              <li>Accept responsibility for all activities under your account</li>
            </ul>
            
            <h3 className="mb-2 text-xl font-semibold">Account Termination</h3>
            <p className="mb-4">
              We reserve the right to suspend or terminate accounts that violate these Terms or engage in harmful activities.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">4. Acceptable Use Policy</h2>
            <p className="mb-4">You agree not to use our services to:</p>
            <ul className="mb-4 list-disc pl-6">
              <li>Violate any laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Transmit harmful or malicious content</li>
              <li>Engage in fraudulent or deceptive practices</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Use our services for illegal or unethical AI applications</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">5. Intellectual Property Rights</h2>
            <h3 className="mb-2 text-xl font-semibold">Our Intellectual Property</h3>
            <p className="mb-4">
              All content, features, and functionality of our platform are owned by Hyah! AI, Inc. and are protected by copyright, trademark, and other intellectual property laws.
            </p>
            
            <h3 className="mb-2 text-xl font-semibold">Your Content</h3>
            <p className="mb-4">
              You retain ownership of content you submit to our platform. By uploading content, you grant us a license to use, modify, and distribute it as necessary to provide our services.
            </p>
            
            <h3 className="mb-2 text-xl font-semibold">AI-Generated Content</h3>
            <p className="mb-4">
              Content generated through our AI services is subject to the licensing terms of the underlying AI models. You are responsible for ensuring appropriate use of AI-generated content.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">6. Payment Terms</h2>
            <p className="mb-4">
              By purchasing our services, you agree to:
            </p>
            <ul className="mb-4 list-disc pl-6">
              <li>Pay all fees according to the pricing plan selected</li>
              <li>Provide accurate payment information</li>
              <li>Authorize recurring charges for subscription services</li>
              <li>Pay any applicable taxes</li>
            </ul>
            <p className="mb-4">
              Refunds are handled on a case-by-case basis. Contact support for refund requests.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">7. Confidentiality</h2>
            <p className="mb-4">
              Both parties agree to maintain the confidentiality of sensitive information shared during the course of service delivery. This includes but is not limited to business strategies, proprietary data, and technical information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">8. Limitation of Liability</h2>
            <p className="mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, HYAH! AI, INC. SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY.
            </p>
            <p className="mb-4">
              Our total liability for any claims arising from these Terms or our services shall not exceed the amount paid by you to us in the twelve months preceding the claim.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">9. Disclaimers</h2>
            <p className="mb-4">
              Our services are provided "as is" and "as available" without warranties of any kind. We do not guarantee:
            </p>
            <ul className="mb-4 list-disc pl-6">
              <li>Uninterrupted or error-free service</li>
              <li>Accuracy or reliability of AI-generated content</li>
              <li>Specific results or outcomes from our services</li>
              <li>Compatibility with all systems or software</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">10. Indemnification</h2>
            <p className="mb-4">
              You agree to indemnify and hold harmless Hyah! AI, Inc., its affiliates, and their respective officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from your use of our services or violation of these Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">11. Governing Law and Dispute Resolution</h2>
            <p className="mb-4">
              These Terms are governed by the laws of [Your Jurisdiction]. Any disputes shall be resolved through binding arbitration in accordance with the rules of [Arbitration Organization].
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">12. Changes to Terms</h2>
            <p className="mb-4">
              We reserve the right to modify these Terms at any time. We will notify users of material changes via email or platform notification. Continued use of our services after changes constitutes acceptance of the modified Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">13. Severability</h2>
            <p className="mb-4">
              If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">14. Contact Information</h2>
            <p className="mb-4">
              For questions about these Terms of Service, please contact us at:
            </p>
            <p className="mb-4">
              Hyah! AI, Inc.<br />
              Email: <a href="mailto:legal@hyah.ai" className="text-[var(--color-primary)] hover:underline">legal@hyah.ai</a><br />
              Address: [Your Business Address]
            </p>
          </section>
        </div>
      </main>

      {/* Simple footer */}
      <footer className="border-t bg-[var(--color-surface-alt)] py-6">
        <div className="container mx-auto px-6 text-center text-sm text-[var(--color-text-muted)]">
          © {new Date().getFullYear()} Hyah! AI, Inc. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

import Link from "next/link";

export default function PrivacyPolicy() {
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
        <h1 className="mb-8 text-4xl font-bold text-[var(--color-text)]">Privacy Policy</h1>
        <p className="mb-4 text-sm text-[var(--color-text-muted)]">Effective Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <div className="prose prose-lg max-w-none">
          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">1. Introduction</h2>
            <p className="mb-4">
              Hyah! AI, Inc. ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered outsourcing platform and services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">2. Information We Collect</h2>
            <h3 className="mb-2 text-xl font-semibold">Personal Information</h3>
            <ul className="mb-4 list-disc pl-6">
              <li>Name and contact information (email address, company name)</li>
              <li>Account credentials</li>
              <li>Payment and billing information</li>
              <li>Professional information and project requirements</li>
            </ul>
            
            <h3 className="mb-2 text-xl font-semibold">Usage Information</h3>
            <ul className="mb-4 list-disc pl-6">
              <li>Log data and analytics</li>
              <li>Device and browser information</li>
              <li>IP addresses and location data</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">3. How We Use Your Information</h2>
            <p className="mb-4">We use the collected information to:</p>
            <ul className="mb-4 list-disc pl-6">
              <li>Provide and maintain our services</li>
              <li>Process transactions and manage your account</li>
              <li>Communicate with you about services, updates, and offers</li>
              <li>Improve our platform and develop new features</li>
              <li>Ensure security and prevent fraud</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">4. Information Sharing and Disclosure</h2>
            <p className="mb-4">We do not sell your personal information. We may share your information with:</p>
            <ul className="mb-4 list-disc pl-6">
              <li>Service providers and contractors who assist in our operations</li>
              <li>AI service providers (with appropriate safeguards)</li>
              <li>Legal authorities when required by law</li>
              <li>Business partners with your consent</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">5. Data Security</h2>
            <p className="mb-4">
              We implement industry-standard security measures to protect your information, including:
            </p>
            <ul className="mb-4 list-disc pl-6">
              <li>Encryption of data in transit and at rest</li>
              <li>Regular security assessments and audits</li>
              <li>Access controls and authentication measures</li>
              <li>Employee training on data protection</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">6. Your Rights and Choices</h2>
            <p className="mb-4">You have the right to:</p>
            <ul className="mb-4 list-disc pl-6">
              <li>Access and update your personal information</li>
              <li>Request deletion of your data</li>
              <li>Opt-out of marketing communications</li>
              <li>Request data portability</li>
              <li>Lodge a complaint with supervisory authorities</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">7. AI and Automated Processing</h2>
            <p className="mb-4">
              Our platform uses AI technologies to provide services. We ensure:
            </p>
            <ul className="mb-4 list-disc pl-6">
              <li>Transparency in AI-driven decisions</li>
              <li>Human oversight where appropriate</li>
              <li>Data minimization in AI processing</li>
              <li>Regular audits of AI systems</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">8. International Data Transfers</h2>
            <p className="mb-4">
              Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">9. Children's Privacy</h2>
            <p className="mb-4">
              Our services are not directed to individuals under 18. We do not knowingly collect personal information from children.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">10. Changes to This Policy</h2>
            <p className="mb-4">
              We may update this Privacy Policy periodically. We will notify you of material changes via email or platform notification.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">11. Contact Us</h2>
            <p className="mb-4">
              For questions about this Privacy Policy or our privacy practices, please contact us at:
            </p>
            <p className="mb-4">
              Hyah! AI, Inc.<br />
              Email: <a href="mailto:privacy@hyah.ai" className="text-[var(--color-primary)] hover:underline">privacy@hyah.ai</a><br />
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

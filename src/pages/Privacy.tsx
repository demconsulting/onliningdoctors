import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const Privacy = () => (
  <div className="flex min-h-screen flex-col bg-background">
    <Navbar />
    <main className="flex-1 py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl prose prose-sm dark:prose-invert">
          <h1 className="font-display text-3xl font-bold text-foreground">Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: February 2026</p>

          <h2 className="font-display text-xl font-semibold text-foreground mt-8">1. Information We Collect</h2>
          <p className="text-muted-foreground">
            We collect information you provide directly: name, email, phone, date of birth, medical history, and documents you upload. We also collect usage data such as pages visited and features used.
          </p>

          <h2 className="font-display text-xl font-semibold text-foreground mt-8">2. How We Use Your Information</h2>
          <p className="text-muted-foreground">
            Your data is used to provide healthcare services, facilitate appointments, enable doctor-patient communication, improve our services, and send relevant notifications.
          </p>

          <h2 className="font-display text-xl font-semibold text-foreground mt-8">3. Data Security</h2>
          <p className="text-muted-foreground">
            We use industry-standard encryption and security measures to protect your data. Medical records are stored with enterprise-grade security through our database provider. Access to your medical data is restricted to you and your authorized healthcare providers.
          </p>

          <h2 className="font-display text-xl font-semibold text-foreground mt-8">4. Data Sharing</h2>
          <p className="text-muted-foreground">
            We do not sell your personal data. Information is shared only with your selected healthcare providers and as required by law. Video consultations are peer-to-peer and are not recorded or stored by the Platform.
          </p>

          <h2 className="font-display text-xl font-semibold text-foreground mt-8">5. Your Rights</h2>
          <p className="text-muted-foreground">
            You may access, update, or delete your personal data through your dashboard. You can request a complete export of your data or account deletion by contacting privacy@doco.health.
          </p>

          <h2 className="font-display text-xl font-semibold text-foreground mt-8">6. Cookies</h2>
          <p className="text-muted-foreground">
            We use essential cookies for authentication and session management. No third-party tracking cookies are used.
          </p>

          <h2 className="font-display text-xl font-semibold text-foreground mt-8">7. Contact</h2>
          <p className="text-muted-foreground">
            For privacy inquiries, contact our Data Protection Officer at privacy@doco.health.
          </p>
        </div>
      </div>
    </main>
    <Footer />
  </div>
);

export default Privacy;

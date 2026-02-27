import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const Terms = () => (
  <div className="flex min-h-screen flex-col bg-background">
    <Navbar />
    <main className="flex-1 py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl prose prose-sm dark:prose-invert">
          <h1 className="font-display text-3xl font-bold text-foreground">Terms of Service</h1>
          <p className="text-muted-foreground">Last updated: February 2026</p>

          <h2 className="font-display text-xl font-semibold text-foreground mt-8">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground">
            By accessing and using Doco ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Platform.
          </p>

          <h2 className="font-display text-xl font-semibold text-foreground mt-8">2. Description of Service</h2>
          <p className="text-muted-foreground">
            Doco provides a healthcare platform connecting patients with medical professionals. Our services include appointment scheduling, telemedicine consultations, medical record management, and related healthcare coordination tools.
          </p>

          <h2 className="font-display text-xl font-semibold text-foreground mt-8">3. User Accounts</h2>
          <p className="text-muted-foreground">
            You must provide accurate information when creating an account. You are responsible for maintaining the confidentiality of your credentials and for all activities under your account.
          </p>

          <h2 className="font-display text-xl font-semibold text-foreground mt-8">4. Medical Disclaimer</h2>
          <p className="text-muted-foreground">
            The Platform facilitates connections between patients and doctors but does not provide medical advice. All medical decisions should be made in consultation with qualified healthcare professionals. In case of emergency, call your local emergency services.
          </p>

          <h2 className="font-display text-xl font-semibold text-foreground mt-8">5. Limitation of Liability</h2>
          <p className="text-muted-foreground">
            Doco is not liable for any medical outcomes, diagnoses, or treatments resulting from the use of the Platform. The Platform is provided "as is" without warranties of any kind.
          </p>

          <h2 className="font-display text-xl font-semibold text-foreground mt-8">6. Contact</h2>
          <p className="text-muted-foreground">
            For questions about these terms, contact us at legal@doco.health.
          </p>
        </div>
      </div>
    </main>
    <Footer />
  </div>
);

export default Terms;

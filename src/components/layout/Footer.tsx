import { Link } from "react-router-dom";
import { Stethoscope, Shield, AlertCircle } from "lucide-react";

const Footer = () => (
  <footer className="border-t border-border bg-card">
    {/* Alert Banners */}
    <div className="border-b border-border bg-muted/50">
      <div className="container mx-auto px-4 py-4 space-y-3">
        <div className="flex gap-3 rounded-lg bg-background p-4">
          <Shield className="h-5 w-5 flex-shrink-0 text-primary" />
          <p className="text-sm text-foreground">
            All consultations are conducted by independently licensed and registered healthcare professionals.
          </p>
        </div>
        <div className="flex gap-3 rounded-lg bg-background p-4">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-destructive" />
          <p className="text-sm text-foreground">
            <span className="font-semibold">Not for emergencies:</span> This platform is not intended for medical emergencies. If you are experiencing a medical emergency, please call your local emergency services immediately.
          </p>
        </div>
      </div>
    </div>

    {/* Main Footer */}
    <div className="container mx-auto px-4 py-12">
      <div className="grid gap-8 md:grid-cols-5">
        {/* Brand & Contact */}
        <div>
          <Link to="/" className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
              <Stethoscope className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold">Onlining Doctors</span>
          </Link>
          <p className="mb-4 text-sm text-muted-foreground">
            Making healthcare accessible, one consultation at a time.
          </p>
          <div className="space-y-2">
            <h5 className="font-semibold text-foreground">Contact Us</h5>
            <p className="text-sm text-muted-foreground">
              Email: <a href="mailto:support@doctorsonlining.com" className="text-primary hover:underline">support@doctorsonlining.com</a>
            </p>
            <p className="text-sm text-muted-foreground">
              WhatsApp: <a href="https://wa.me/27605445802" className="text-primary hover:underline">+27 60 544 5802</a>
            </p>
          </div>
        </div>

        {/* For Patients */}
        <div>
          <h4 className="mb-3 font-display font-semibold text-foreground">For Patients</h4>
          <div className="flex flex-col gap-2">
            <Link to="/doctors" className="text-sm text-muted-foreground hover:text-foreground">Find Doctors</Link>
            <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">Book Appointment</Link>
            <a href="/#how-it-works" className="text-sm text-muted-foreground hover:text-foreground">How It Works</a>
          </div>
        </div>

        {/* For Doctors */}
        <div>
          <h4 className="mb-3 font-display font-semibold text-foreground">For Doctors</h4>
          <div className="flex flex-col gap-2">
            <Link to="/doctor-signup" className="text-sm text-muted-foreground hover:text-foreground">Register</Link>
            <a href="#benefits" className="text-sm text-muted-foreground hover:text-foreground">Benefits</a>
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">Doctor Login</Link>
          </div>
        </div>

        {/* Legal & Company */}
        <div>
          <h4 className="mb-3 font-display font-semibold text-foreground">Legal & Company</h4>
          <div className="flex flex-col gap-2">
            <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground">Terms & Conditions</Link>
            <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground">Privacy Policy (POPIA)</Link>
            <a href="#refund" className="text-sm text-muted-foreground hover:text-foreground">Refund Policy</a>
            <a href="#corporate" className="text-sm text-muted-foreground hover:text-foreground">Corporate Portal</a>
            <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground">Admin Login</Link>
          </div>
        </div>
      </div>
    </div>

    {/* Bottom Section */}
    <div className="border-t border-border bg-muted/30">
      <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground space-y-2">
        <p>Physical Address: 61 Albatross Drive, Fourways, 2191, South Africa</p>
        <p>© {new Date().getFullYear()} Doctors Onlining. All rights reserved.</p>
      </div>
    </div>
  </footer>
);

export default Footer;

import { Link } from "react-router-dom";
import { Stethoscope } from "lucide-react";

const Footer = () => (
  <footer className="border-t border-border bg-card">
    <div className="container mx-auto px-4 py-12">
      <div className="grid gap-8 md:grid-cols-4">
        <div>
          <Link to="/" className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
              <Stethoscope className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold">Doco<span className="text-primary">.</span></span>
          </Link>
          <p className="text-sm text-muted-foreground">
            Connect with qualified doctors online. Secure, convenient healthcare at your fingertips.
          </p>
        </div>
        <div>
          <h4 className="mb-3 font-display font-semibold text-foreground">Platform</h4>
          <div className="flex flex-col gap-2">
            <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground">About Us</Link>
            <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground">Contact</Link>
          </div>
        </div>
        <div>
          <h4 className="mb-3 font-display font-semibold text-foreground">Account</h4>
          <div className="flex flex-col gap-2">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">Log in</Link>
            <Link to="/signup" className="text-sm text-muted-foreground hover:text-foreground">Sign up</Link>
          </div>
        </div>
        <div>
          <h4 className="mb-3 font-display font-semibold text-foreground">Legal</h4>
          <div className="flex flex-col gap-2">
            <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground">Privacy Policy</Link>
            <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground">Terms of Service</Link>
          </div>
        </div>
      </div>
      <div className="mt-8 border-t border-border pt-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Doco. All rights reserved.
      </div>
    </div>
  </footer>
);

export default Footer;

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import Navbar from "@/components/layout/Navbar";

const EmailConfirmed = () => (
  <div className="flex min-h-screen flex-col bg-background">
    <Navbar />
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md border-border">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <CheckCircle2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="font-display text-2xl">Email confirmed</CardTitle>
          <CardDescription>
            Your email has been confirmed successfully. You may now sign in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full gradient-primary border-0 text-primary-foreground">
            <Link to="/signin">Sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  </div>
);

export default EmailConfirmed;

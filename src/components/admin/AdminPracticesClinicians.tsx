import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Stethoscope } from "lucide-react";
import AdminPractices from "@/components/admin/AdminPractices";
import AdminIndependentDoctors from "@/components/admin/AdminIndependentDoctors";

const AdminPracticesClinicians = () => (
  <div className="space-y-6">
    <div>
      <h2 className="font-display text-xl font-semibold">Practices &amp; Clinicians</h2>
      <p className="text-sm text-muted-foreground">
        Approve group practices and independent doctors, and set up their Paystack payout accounts.
      </p>
    </div>
    <Tabs defaultValue="group" className="space-y-4">
      <TabsList>
        <TabsTrigger value="group" className="gap-1.5"><Building2 className="h-4 w-4" /> Group Practices</TabsTrigger>
        <TabsTrigger value="independent" className="gap-1.5"><Stethoscope className="h-4 w-4" /> Independent Doctors</TabsTrigger>
      </TabsList>
      <TabsContent value="group"><AdminPractices /></TabsContent>
      <TabsContent value="independent"><AdminIndependentDoctors /></TabsContent>
    </Tabs>
  </div>
);

export default AdminPracticesClinicians;

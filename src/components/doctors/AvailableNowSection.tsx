import { Zap } from "lucide-react";
import DoctorCardNew from "./DoctorCardNew";
import type { Doctor } from "./DoctorCardNew";

const AvailableNowSection = ({ doctors }: { doctors: Doctor[] }) => {
  if (doctors.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="flex items-center gap-2 mb-5">
        <div className="flex items-center gap-2 rounded-full bg-success/10 px-4 py-1.5 text-success">
          <Zap className="h-4 w-4 fill-success" />
          <span className="text-sm font-bold">Available Right Now</span>
        </div>
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {doctors.slice(0, 3).map((doc) => (
          <DoctorCardNew key={doc.id} doctor={doc} />
        ))}
      </div>
    </section>
  );
};

export default AvailableNowSection;

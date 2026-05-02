// Single bundle for all below-the-fold homepage sections.
// Consolidating reduces over-fragmentation (many tiny chunks → one) and
// shrinks the number of homepage JS requests after the hero paints.
import StatsSection from "./StatsSection";
import WhyChooseSection from "./WhyChooseSection";
import FindDoctorSection from "./FindDoctorSection";
import DoctorCTASection from "./DoctorCTASection";
import FAQSection from "./FAQSection";

export const sectionMap: Record<string, React.ComponentType> = {
  stats: StatsSection,
  "why-choose": WhyChooseSection,
  "find-doctor": FindDoctorSection,
  "doctor-cta": DoctorCTASection,
  faq: FAQSection,
};

const BelowTheFold = ({ keys }: { keys: string[] }) => (
  <>
    {keys.map((k) => {
      const C = sectionMap[k];
      return C ? <C key={k} /> : null;
    })}
  </>
);

export default BelowTheFold;

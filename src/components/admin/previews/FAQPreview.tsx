import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FAQ { id: string; question: string; answer: string; }

const FAQPreview = ({ faqs }: { faqs: FAQ[] }) => (
  <div className="rounded-lg bg-muted p-6">
    <div className="text-center mb-4">
      <h2 className="font-display text-lg font-bold text-foreground mb-1">Frequently Asked Questions</h2>
      <p className="text-xs text-muted-foreground">Everything you need to know</p>
    </div>
    <div className="mx-auto max-w-md">
      <Accordion type="single" collapsible className="space-y-2">
        {faqs.map((faq) => (
          <AccordionItem key={faq.id} value={faq.id} className="rounded-lg border border-border bg-card px-3">
            <AccordionTrigger className="text-left text-xs font-display font-semibold text-foreground hover:no-underline py-2">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-[10px] text-muted-foreground pb-2">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      {faqs.length === 0 && (
        <p className="text-center text-xs text-muted-foreground py-4">No FAQs added yet</p>
      )}
    </div>
  </div>
);

export default FAQPreview;

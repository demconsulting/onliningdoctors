import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const PRE_FILLED = encodeURIComponent("Hi, I need help booking a consultation.");

const WhatsAppButton = () => {
  const [number, setNumber] = useState("27605445802");

  useEffect(() => {
    supabase
      .from("site_content")
      .select("value")
      .eq("key", "footer")
      .maybeSingle()
      .then(({ data }) => {
        const val = data?.value as any;
        if (val?.whatsapp) setNumber(val.whatsapp);
      });
  }, []);

  return (
    <a
      href={`https://wa.me/${number}?text=${PRE_FILLED}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-white shadow-lg shadow-[#25D366]/30 transition-transform hover:scale-105 hover:shadow-xl"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle className="h-5 w-5 fill-white" />
      <span className="hidden sm:inline text-sm font-semibold">Need help? Chat with us</span>
    </a>
  );
};

export default WhatsAppButton;

import { MessageCircle } from "lucide-react";

const WHATSAPP_NUMBER = "27600000000"; // Replace with actual number
const PRE_FILLED = encodeURIComponent("Hi, I need help booking a consultation.");

const WhatsAppButton = () => (
  <a
    href={`https://wa.me/${WHATSAPP_NUMBER}?text=${PRE_FILLED}`}
    target="_blank"
    rel="noopener noreferrer"
    className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-white shadow-lg shadow-[#25D366]/30 transition-transform hover:scale-105 hover:shadow-xl"
    aria-label="Chat on WhatsApp"
  >
    <MessageCircle className="h-5 w-5 fill-white" />
    <span className="hidden sm:inline text-sm font-semibold">Need help? Chat with us</span>
  </a>
);

export default WhatsAppButton;

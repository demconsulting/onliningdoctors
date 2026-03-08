import { Video, Calendar, Shield } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Video,
    title: "HD Video Consultations",
    description: "Connect face-to-face with doctors through secure, high-quality video calls from anywhere.",
  },
  {
    icon: Calendar,
    title: "Easy Scheduling",
    description: "Book appointments instantly or schedule for later. Get reminders and manage everything in one place.",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "Your health data is encrypted and protected with industry-leading security standards.",
  },
];

const WhyChooseSection = () => (
  <section id="how-it-works" className="py-20 bg-secondary/5">
    <div className="container mx-auto px-4">
      <div className="text-center mb-16">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
          Why Choose Onlining Doctors?
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Experience healthcare reimagined with our comprehensive telemedicine platform
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-8">
        {features.map((feature, i) => (
          <motion.div
            key={feature.title}
            className="bg-card p-8 rounded-xl border border-border shadow-sm hover:shadow-md transition-all duration-300"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
          >
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <feature.icon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-display text-xl font-bold text-foreground mb-3">{feature.title}</h3>
            <p className="text-muted-foreground">{feature.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default WhyChooseSection;

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      react: path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
    },
  },
  build: {
    // Strip <link rel="modulepreload"> for heavy chunks that are only needed
    // on non-landing routes (dashboards, charts, PDFs, calendar, etc). Vite
    // otherwise walks the dynamic-import graph and preloads them on the
    // homepage, which inflates JS download/parse cost and hurts LCP.
    modulePreload: {
      resolveDependencies: (_url, deps) =>
        deps.filter((dep) => {
          const heavyOnlyForLazyRoutes = [
            "charts-",
            "pdf-",
            "calendar-",
            "date-",
            "legalContent-",
            "AdminDashboard-",
            "Dashboard-",
            "DoctorDashboard-",
            "DoctorEarnings-",
            "PrescriptionView-",
            "PrescriptionForm-",
            "CallPage-",
          ];
          return !heavyOnlyForLazyRoutes.some((name) => dep.includes(name));
        }),
    },
    // Split heavy third-party libraries into separate chunks so the landing
    // page bundle stays small and LCP-sensitive code ships first.
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return;
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          if (id.includes("framer-motion")) return "motion";
          if (id.includes("@radix-ui")) return "radix";
          if (id.includes("react-hook-form") || id.includes("zod")) return "forms";
          if (id.includes("date-fns")) return "date";
          if (id.includes("html2pdf") || id.includes("jspdf") || id.includes("html2canvas")) return "pdf";
          if (id.includes("@supabase")) return "supabase";
        },
      },
    },
  },
}));

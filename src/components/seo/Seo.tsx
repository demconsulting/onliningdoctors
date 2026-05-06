import { useEffect } from "react";

interface SeoProps {
  title: string;
  description: string;
  path: string;
  image?: string;
  noIndex?: boolean;
}

const SITE_NAME = "Doctors Onlining";
const SITE_URL = "https://doctorsonlining.com";
const DEFAULT_IMAGE =
  "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/cc0c1d02-8799-460c-b6d9-f7a1c059cfe4/id-preview-17a6bbd2--727c4868-8e40-4bbb-94cb-b9a28a54c514.lovable.app-1772383313363.png";

const upsertMeta = (selector: string, attributes: Record<string, string>) => {
  let element = document.head.querySelector(selector) as HTMLMetaElement | null;

  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element?.setAttribute(key, value);
  });
};

const upsertLink = (rel: string, href: string) => {
  let element = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;

  if (!element) {
    element = document.createElement("link");
    element.rel = rel;
    document.head.appendChild(element);
  }

  element.href = href;
};

const Seo = ({ title, description, path, image = DEFAULT_IMAGE, noIndex = false }: SeoProps) => {
  useEffect(() => {
    const canonicalUrl = `${SITE_URL}${path}`;
    document.title = title;
    upsertLink("canonical", canonicalUrl);
    upsertLink("icon", "/favicon.ico", { sizes: "any" });

    upsertLink("icon", "/favicon-48x48.png", {
      type: "image/png",
      sizes: "48x48",
    });

    upsertLink("icon", "/favicon-32x32.png", {
      type: "image/png",
      sizes: "32x32",
    });

    upsertMeta('meta[name="description"]', { name: "description", content: description });
    upsertMeta('meta[name="robots"]', { name: "robots", content: noIndex ? "noindex, nofollow" : "index, follow" });
    upsertMeta('meta[property="og:type"]', { property: "og:type", content: "website" });
    upsertMeta('meta[property="og:site_name"]', { property: "og:site_name", content: SITE_NAME });
    upsertMeta('meta[property="og:title"]', { property: "og:title", content: title });
    upsertMeta('meta[property="og:description"]', { property: "og:description", content: description });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: canonicalUrl });
    upsertMeta('meta[property="og:image"]', { property: "og:image", content: image });
    upsertMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
    upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: title });
    upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: description });
    upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: image });
  }, [description, image, noIndex, path, title]);

  return null;
};

export default Seo;

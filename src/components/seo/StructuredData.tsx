import { useEffect } from "react";

/**
 * Injects a JSON-LD <script> into <head> for the lifetime of the component.
 * Removes it on unmount so per-route schemas don't accumulate.
 */
interface StructuredDataProps {
  id: string;
  data: Record<string, unknown> | Record<string, unknown>[];
}

export const StructuredData = ({ id, data }: StructuredDataProps) => {
  useEffect(() => {
    const scriptId = `ld-json-${id}`;
    const existing = document.getElementById(scriptId);
    if (existing) existing.remove();

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = scriptId;
    script.text = JSON.stringify(data);
    document.head.appendChild(script);

    return () => {
      const el = document.getElementById(scriptId);
      if (el) el.remove();
    };
  }, [id, data]);

  return null;
};

const BASE = "https://lablink-smartlab.lovable.app";

export const breadcrumbSchema = (
  items: { name: string; path: string }[],
) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: item.name,
    item: `${BASE}${item.path}`,
  })),
});

export const websiteSchema = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "LabLink",
  url: `${BASE}/`,
  potentialAction: {
    "@type": "SearchAction",
    target: `${BASE}/labs?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
});

export const faqSchema = (items: { question: string; answer: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: items.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
});


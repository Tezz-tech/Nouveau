import { Helmet } from "react-helmet-async";
import { site } from "@/content/site";

export default function Seo({
  title,
  description,
  path = "/",
}: {
  title: string;
  description: string;
  path?: string;
}) {
  const fullTitle = `${title} — ${site.name}`;
  const url = `${site.url}${path}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={site.name} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  );
}

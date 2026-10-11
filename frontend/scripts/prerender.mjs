// Runs after `vite build`. The app is a single-page app, so every address
// would otherwise answer with the same index.html — the same title and the
// same link preview whether someone shares the home page or Flamengo's. Link
// previews (WhatsApp, Telegram, Instagram) never run JavaScript, and search
// engines read the HTML first, so the page-specific tags have to be IN the
// HTML. This writes one copy of the built index.html per page, with that
// page's own tags, at dist/<path>/index.html: Vercel serves a real file
// before it falls back to the SPA rewrite, so the page still boots the app
// exactly as before. It also writes sitemap.xml.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SITE_URL, allStaticPages, indexablePages } from "@ondevaipassar/shared";

const DIST = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");

const escapeAttribute = (value) => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
const escapeText = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;");

/** Replaces one tag the template is known to carry. A tag that isn't there is a build error, not a silent no-op: that would ship pages with the wrong preview. */
function replaceTag(html, pattern, replacement) {
  if (!pattern.test(html)) throw new Error(`index.html has no tag matching ${pattern}`);
  return html.replace(pattern, replacement);
}

function renderPage(template, page) {
  const url = `${SITE_URL}${page.path === "/" ? "/" : page.path}`;
  const title = escapeAttribute(page.title);
  const description = escapeAttribute(page.description);
  let html = template;
  html = replaceTag(html, /<title>[^<]*<\/title>/, `<title>${escapeText(page.title)}</title>`);
  html = replaceTag(html, /<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${description}" />`);
  html = replaceTag(html, /<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${url}" />`);
  html = replaceTag(html, /<meta name="robots" content="[^"]*" \/>/, `<meta name="robots" content="${page.noindex ? "noindex, follow" : "index, follow"}" />`);
  html = replaceTag(html, /<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${url}" />`);
  html = replaceTag(html, /<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${title}" />`);
  html = replaceTag(html, /<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${description}" />`);
  html = replaceTag(html, /<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${title}" />`);
  html = replaceTag(html, /<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${description}" />`);
  return html;
}

const template = await readFile(join(DIST, "index.html"), "utf-8");

// The home page is the template itself, rewritten in place.
const pages = allStaticPages();
let written = 0;
for (const page of pages) {
  const html = renderPage(template, page);
  const target = page.path === "/" ? join(DIST, "index.html") : join(DIST, page.path, "index.html");
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, html, "utf-8");
  written += 1;
}

const today = new Date().toISOString().slice(0, 10);
const urls = indexablePages()
  .map((page) => `  <url><loc>${SITE_URL}${page.path === "/" ? "/" : page.path}</loc><lastmod>${today}</lastmod></url>`)
  .join("\n");
await writeFile(join(DIST, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, "utf-8");

console.log(`prerender: ${written} páginas e sitemap com ${indexablePages().length} endereços`);

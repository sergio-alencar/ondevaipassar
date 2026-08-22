/** Strips diacritics and lowercases -- the one normalization helper every alias/resolver in this codebase should share, instead of each redefining it (that duplication is exactly what produced the old codebase's divergent normalization schemes). */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** normalizeText, then collapses anything non-alphanumeric into a single separator -- for building slugs/filenames. Only ever called with plain word characters as separator (default "-"), so no regex-escaping is needed for it. */
export function slugify(value: string, separator = "-"): string {
  const collapsed = normalizeText(value).replace(/[^a-z0-9]+/g, separator);
  return collapsed.startsWith(separator) || collapsed.endsWith(separator)
    ? collapsed.split(separator).filter(Boolean).join(separator)
    : collapsed;
}

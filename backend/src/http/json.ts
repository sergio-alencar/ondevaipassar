/**
 * Extracts a balanced-bracket JSON value (object or array) embedded inside a
 * larger non-JSON source (e.g. a `<script>var x = {...};</script>` blob),
 * starting at the given opening-bracket index (`{` or `[`). A plain regex
 * can't reliably find the matching close bracket once the JSON itself
 * contains brackets inside string values. Only the opening bracket's own
 * type is tracked — safe because, outside of strings, a `{`/`}` pair and a
 * `[`/`]` pair are each independently balanced regardless of what's nested
 * inside the other, so counting just one type still finds its true match.
 * Shared by every source whose page embeds JSON this way (ge.globo's
 * scheduleTeam and news-feed items, YouTube's ytInitialData) — each source's
 * client.ts locates its own marker and start index, then hands off here.
 */
export function extractBalancedJsonObject(source: string, openBraceIndex: number): string {
  const openChar = source[openBraceIndex];
  const closeChar = openChar === "[" ? "]" : "}";
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = openBraceIndex; i < source.length; i++) {
    const char = source[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === openChar) depth++;
    else if (char === closeChar) {
      depth--;
      if (depth === 0) return source.slice(openBraceIndex, i + 1);
    }
  }
  throw new Error("Unbalanced brackets while extracting embedded JSON value");
}

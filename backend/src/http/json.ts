/**
 * Extracts a balanced-brace JSON object embedded inside a larger non-JSON
 * source (e.g. a `<script>var x = {...};</script>` blob), starting at the
 * given opening-brace index. A plain regex can't reliably find the matching
 * close brace once the JSON itself contains braces inside string values.
 * Shared by every source whose page embeds JSON this way (ge.globo's
 * scheduleTeam, YouTube's ytInitialData) — each source's client.ts locates
 * its own marker and start index, then hands off here.
 */
export function extractBalancedJsonObject(source: string, openBraceIndex: number): string {
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
    else if (char === "{") depth++;
    else if (char === "}") {
      depth--;
      if (depth === 0) return source.slice(openBraceIndex, i + 1);
    }
  }
  throw new Error("Unbalanced braces while extracting embedded JSON object");
}

// Tailwind only picks up class names it can find as literal strings at build
// time, so a team's `color` token (e.g. "red-800") has to be mapped to a
// full class name here rather than interpolated directly (`bg-${color}`
// would get purged). Header and Footer both need this — extracted once
// instead of the old code's copy in each file.
const BACKGROUND_COLOR_CLASSES: Record<string, string> = {
  "purple-900": "bg-purple-900",
  black: "bg-black",
  "blue-900": "bg-blue-900",
  "red-800": "bg-red-800",
  "blue-800": "bg-blue-800",
  "green-900": "bg-green-900",
};

const TEXT_COLOR_CLASSES: Record<string, string> = {
  "purple-900": "text-purple-900",
  black: "text-black",
  "blue-900": "text-blue-900",
  "red-800": "text-red-800",
  "blue-800": "text-blue-800",
  "green-900": "text-green-900",
  "gray-500": "text-gray-500",
  "gray-800": "text-gray-800",
};

const DEFAULT_COLOR = "purple-900";

export function backgroundColorClass(colorToken: string | undefined): string {
  return BACKGROUND_COLOR_CLASSES[colorToken ?? DEFAULT_COLOR] ?? BACKGROUND_COLOR_CLASSES[DEFAULT_COLOR];
}

export function textColorClass(colorToken: string | undefined, fallback = "gray-500"): string {
  return TEXT_COLOR_CLASSES[colorToken ?? fallback] ?? TEXT_COLOR_CLASSES[fallback];
}

import type { Division } from "@ondevaipassar/shared";

interface DivisionTabsProps {
  active: Division;
  onChange: (division: Division) => void;
}

const DIVISIONS: Division[] = ["A", "B", "C", "EUROPA", "FEMININO"];

// "Europa"/"Feminino" aren't a "Série X" — need their own label rather than
// the template every other division shares.
const DIVISION_LABELS: Record<Division, string> = {
  A: "Série A",
  B: "Série B",
  C: "Série C",
  EUROPA: "Europa",
  FEMININO: "Feminino",
};

// flex-wrap, not a fixed row: this also renders inside the "TIMES" dropdown
// (DropdownMenu.tsx), whose own box is capped at calc(100vw-3rem) on
// mobile — 5 divisions' worth of buttons at full size overflowed that
// box's edge there (confirmed live). max-sm:* shrinks padding/text so
// they usually still fit one row on a typical phone width; wrap is the
// fallback for anything narrower, instead of a hard horizontal overflow.
const DivisionTabs = ({ active, onChange }: DivisionTabsProps) => (
  <div className="flex flex-wrap justify-center gap-2 max-sm:gap-1.5">
    {DIVISIONS.map((division) => (
      <button
        key={division}
        onClick={() => onChange(division)}
        className={`px-4 py-1.5 max-sm:px-2.5 max-sm:py-1 rounded-full font-bold uppercase text-sm max-sm:text-xs transition cursor-pointer ${
          active === division ? "bg-gray-800 text-white" : "bg-gray-200 text-gray-600 hover:bg-gray-300"
        }`}
      >
        {DIVISION_LABELS[division]}
      </button>
    ))}
  </div>
);

export default DivisionTabs;

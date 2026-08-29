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

const DivisionTabs = ({ active, onChange }: DivisionTabsProps) => (
  <div className="flex justify-center gap-2">
    {DIVISIONS.map((division) => (
      <button
        key={division}
        onClick={() => onChange(division)}
        className={`px-4 py-1.5 rounded-full font-bold uppercase text-sm transition cursor-pointer ${
          active === division ? "bg-gray-800 text-white" : "bg-gray-200 text-gray-600 hover:bg-gray-300"
        }`}
      >
        {DIVISION_LABELS[division]}
      </button>
    ))}
  </div>
);

export default DivisionTabs;

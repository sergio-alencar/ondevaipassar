interface SectionTabsProps<T extends string> {
  options: readonly { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
}

// Same look as DivisionTabs on purpose: both are "pick one view" pills, and two
// slightly different ones side by side would read as two different controls.
function SectionTabs<T extends string>({ options, active, onChange }: SectionTabsProps<T>) {
  return (
    <div className="flex flex-wrap justify-center gap-2 max-sm:gap-1.5" role="tablist">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="tab"
          aria-selected={active === option.id}
          onClick={() => onChange(option.id)}
          className={`px-4 py-1.5 max-sm:px-2.5 max-sm:py-1 rounded-full font-bold uppercase text-sm max-sm:text-xs transition cursor-pointer ${
            active === option.id ? "bg-gray-800 text-white" : "bg-gray-200 text-gray-600 hover:bg-gray-300"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default SectionTabs;

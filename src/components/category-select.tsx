"use client";

type CategorySelectProps = {
  groups: Array<{ id: string; label: string }>;
  activeGroupId: string;
  allLabel: string;
};

export function CategorySelect({ groups, activeGroupId, allLabel }: CategorySelectProps) {
  return (
    <div className="relative flex-1">
      <select
        defaultValue={activeGroupId}
        onChange={(e) => {
          const val = e.target.value;
          window.location.href = val === "all" ? "/" : `/?category=${encodeURIComponent(val)}`;
        }}
        className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm font-semibold text-slate-700 shadow-sm outline-none transition focus:border-sky-300"
      >
        <option value="all">{allLabel}</option>
        {groups.map((group) => (
          <option key={group.id} value={group.id}>
            {group.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

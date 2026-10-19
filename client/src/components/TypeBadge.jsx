/**
 * TypeBadge renders a colored pill badge for Incoming/Outgoing file types.
 * Incoming → green
 * Outgoing → orange
 */
const typeMap = {
  incoming: {
    label: 'Incoming',
    className: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  },
  outgoing: {
    label: 'Outgoing',
    className: 'bg-orange-100 text-orange-800 border border-orange-200',
  },
};

export default function TypeBadge({ type }) {
  const key = (type || '').toLowerCase();
  const config = typeMap[key] || {
    label: type || 'Unknown',
    className: 'bg-slate-100 text-slate-700 border border-slate-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${config.className}`}
    >
      {config.label}
    </span>
  );
}

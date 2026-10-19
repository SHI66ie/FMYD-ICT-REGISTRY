/**
 * StatusBadge renders a colored pill badge based on the file status string.
 * Pending    → yellow
 * In Progress → blue
 * Completed  → green
 * Returned   → red
 */
const statusMap = {
  pending: {
    label: 'Pending',
    className: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  },
  'in progress': {
    label: 'In Progress',
    className: 'bg-blue-100 text-blue-800 border border-blue-200',
  },
  completed: {
    label: 'Completed',
    className: 'bg-green-100 text-green-800 border border-green-200',
  },
  returned: {
    label: 'Returned',
    className: 'bg-red-100 text-red-800 border border-red-200',
  },
};

export default function StatusBadge({ status }) {
  const key = (status || '').toLowerCase();
  const config = statusMap[key] || {
    label: status || 'Unknown',
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

export function ProgressBar({ value, total }: { value: number; total: number }) {
  const ratio = total === 0 ? 0 : Math.min(100, Math.round((value / total) * 100));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
        <span>今週の記録</span>
        <span>
          {value}/{total}
        </span>
      </div>
      <div className="rounded-full bg-[var(--bg-inset)] p-1 shadow-[inset_4px_4px_10px_var(--shadow-dark),inset_-4px_-4px_10px_var(--shadow-light)]">
        <div
          className="h-3 rounded-full bg-[var(--accent)] transition-all"
          style={{ width: `${ratio}%` }}
        />
      </div>
    </div>
  );
}


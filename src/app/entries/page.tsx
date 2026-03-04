import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { MobileShell } from "@/components/layout/mobile-shell";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/user";
import { getEntriesForUser } from "@/lib/data/queries";
import { formatShortDate } from "@/lib/utils";

type EntrySearchParams = {
  q?: string;
  month?: string;
  date?: string;
};

const weekdayLabels = ["日", "月", "火", "水", "木", "金", "土"];

function isValidMonth(value?: string): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}$/.test(value);
}

function isValidDate(value?: string): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function shiftMonth(value: string, amount: number) {
  const [year, month] = value.split("-").map(Number);
  const date = new Date(year, month - 1 + amount, 1);
  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
  return `${nextYear}-${nextMonth}`;
}

function formatMonthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  return `${year}年${month}月`;
}

function buildHref(params: EntrySearchParams) {
  const search = new URLSearchParams();

  if (params.q) {
    search.set("q", params.q);
  }
  if (params.month) {
    search.set("month", params.month);
  }
  if (params.date) {
    search.set("date", params.date);
  }

  const query = search.toString();
  return query ? `/entries?${query}` : "/entries";
}

export default async function EntriesPage({
  searchParams,
}: {
  searchParams: Promise<EntrySearchParams>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const entries = await getEntriesForUser(user.id, { q: params.q });

  const fallbackDateValue = entries[0]?.occurredAt.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
  const requestedMonth = params.month;
  const requestedDate = params.date;
  const activeMonth: string = isValidMonth(requestedMonth) ? requestedMonth : fallbackDateValue.slice(0, 7);

  const monthEntries = entries.filter((entry) => entry.occurredAt.startsWith(activeMonth));
  const monthFallbackDate = monthEntries[0]?.occurredAt.slice(0, 10) ?? `${activeMonth}-01`;
  const activeDate: string =
    isValidDate(requestedDate) && requestedDate.startsWith(activeMonth) ? requestedDate : monthFallbackDate;

  const selectedEntries = monthEntries.filter((entry) => entry.occurredAt.slice(0, 10) === activeDate);

  const entryCountByDate = new Map<string, number>();
  for (const entry of monthEntries) {
    const key = entry.occurredAt.slice(0, 10);
    entryCountByDate.set(key, (entryCountByDate.get(key) ?? 0) + 1);
  }

  const [year, month] = activeMonth.split("-").map(Number);
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const prevMonth = shiftMonth(activeMonth, -1);
  const nextMonth = shiftMonth(activeMonth, 1);

  return (
    <MobileShell>
      <div className="space-y-5">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">過去の自分</h1>
          <p className="text-sm text-[var(--text-secondary)]">日付を選んで、その日の記録だけを見返せます。</p>
        </div>

        <Card inset>
          <form className="space-y-3" action="/entries">
            <input type="hidden" name="month" value={activeMonth} />
            <input type="hidden" name="date" value={activeDate} />
            <label className="flex items-center gap-3 rounded-[20px] bg-[var(--bg-page)] px-4 py-4 shadow-[inset_4px_4px_10px_var(--shadow-dark),inset_-4px_-4px_10px_var(--shadow-light)]">
              <Search className="size-4 text-[var(--text-tertiary)]" />
              <input
                type="search"
                name="q"
                defaultValue={params.q}
                placeholder="タイトルや言葉で検索"
                className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none"
              />
            </label>
          </form>
        </Card>

        <Card>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Link
                href={buildHref({ q: params.q, month: prevMonth })}
                aria-label="前の月を見る"
                className="flex size-11 items-center justify-center rounded-full bg-[var(--bg-page)] text-[var(--text-primary)] shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)]"
              >
                <ChevronLeft className="size-4" />
              </Link>
              <p className="text-base font-semibold text-[var(--text-primary)]">{formatMonthLabel(activeMonth)}</p>
              <Link
                href={buildHref({ q: params.q, month: nextMonth })}
                aria-label="次の月を見る"
                className="flex size-11 items-center justify-center rounded-full bg-[var(--bg-page)] text-[var(--text-primary)] shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)]"
              >
                <ChevronRight className="size-4" />
              </Link>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center text-xs text-[var(--text-tertiary)]">
              {weekdayLabels.map((label) => (
                <span key={label} className="py-1">
                  {label}
                </span>
              ))}
              {Array.from({ length: firstWeekday }).map((_, index) => (
                <span key={`empty-${index}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, index) => {
                const day = index + 1;
                const dateValue = `${activeMonth}-${String(day).padStart(2, "0")}`;
                const selected = dateValue === activeDate;
                const count = entryCountByDate.get(dateValue) ?? 0;

                return (
                  <Link
                    key={dateValue}
                    href={buildHref({ q: params.q, month: activeMonth, date: dateValue })}
                    aria-label={`${day}日を表示`}
                    className={`flex min-h-12 flex-col items-center justify-center rounded-[16px] text-sm ${
                      selected
                        ? "bg-[var(--accent)] text-[var(--text-on-accent)]"
                        : "bg-[var(--bg-page)] text-[var(--text-primary)] shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)]"
                    }`}
                  >
                    <span className="font-semibold">{day}</span>
                    <span
                      className={`text-[10px] ${selected ? "opacity-80" : "text-[var(--accent-dark)]"}`}
                    >
                      {count > 0 ? `${count}件` : " "}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </Card>

        <div className="space-y-3">
          <div className="flex items-end justify-between px-1">
            <div>
              <p className="text-lg font-semibold text-[var(--text-primary)]">{formatShortDate(activeDate)}</p>
              <p className="text-sm text-[var(--text-secondary)]">
                {selectedEntries.length > 0 ? `${selectedEntries.length}件の記録` : "この日の記録はありません"}
              </p>
            </div>
          </div>

          {selectedEntries.map((entry) => (
            <Link key={entry.id} href={`/entries/${entry.id}`}>
              <Card className="rounded-[20px] px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{entry.title}</p>
                    <p className="mt-1 text-xs text-[var(--text-tertiary)]">{formatShortDate(entry.occurredAt)}</p>
                  </div>
                  <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-dark)]">
                    {entry.emotions[0] || "未分析"}
                  </span>
                </div>
              </Card>
            </Link>
          ))}

          {selectedEntries.length === 0 ? (
            <Card>
              <p className="text-sm text-[var(--text-secondary)]">別の日付を選ぶと、その日の記録を見られます。</p>
            </Card>
          ) : null}
        </div>
      </div>
    </MobileShell>
  );
}

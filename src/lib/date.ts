export function formatDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).formatToParts(date);

  const lookup = new Map(parts.map((part) => [part.type, part.value]));
  return `${lookup.get("year")}-${lookup.get("month")}-${lookup.get("day")} ${lookup.get("hour")}:${lookup.get("minute")}:${lookup.get("second")}`;
}

export function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateInput(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return undefined;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return undefined;
  }

  return date;
}

export function getRecentDateRange(period: "week" | "month" | "year", now = new Date()) {
  const today = formatDateTime(now).slice(0, 10);
  const end = parseDateInput(today)!;
  const start = new Date(end);
  if (period === "week") {
    start.setDate(start.getDate() - 6);
  } else {
    const day = start.getDate();
    start.setDate(1);
    if (period === "month") start.setMonth(start.getMonth() - 1);
    else start.setFullYear(start.getFullYear() - 1);
    const lastDay = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    start.setDate(Math.min(day, lastDay));
  }
  return { from: formatDateInput(start), to: today };
}

export function validateDateInput(value: string, min?: string, max?: string): string | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Use YYYY-MM-DD (for example, 2026-06-30).";
  if (!parseDateInput(value)) return "This date does not exist.";
  if (min && parseDateInput(min) && value < min) return `Date must be on or after ${min}.`;
  if (max && parseDateInput(max) && value > max) return `Date must be on or before ${max}.`;
  return null;
}

export function getWibTodayDateString(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

export function getWibTodayRange(): { startIso: string; endIso: string } {
  const todayStr = getWibTodayDateString();
  return {
    startIso: `${todayStr}T00:00:00.000+07:00`,
    endIso: `${todayStr}T23:59:59.999+07:00`,
  };
}

export function formatWibDateTime(isoStr: string | null | undefined): string {
  if (!isoStr) return "-";
  try {
    const date = new Date(isoStr);
    return new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(date);
  } catch {
    return isoStr;
  }
}

export function formatWibDateOnly(isoStr: string | null | undefined): string {
  if (!isoStr) return "-";
  try {
    const date = new Date(isoStr);
    return new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return isoStr;
  }
}

export function getDefaultDueDateString(daysAhead = 30): string {
  const now = new Date();
  now.setDate(now.getDate() + daysAhead);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}

export function getCurrentQuarter(now = new Date()) {
  return {
    year: now.getFullYear(),
    quarter: Math.floor(now.getMonth() / 3) + 1,
  };
}

export function getCurrentMonthCycle(now = new Date()) {
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };
}

export function getMonthDateRange(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  return { start, end };
}

export function buildMonthCycleLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Riyadh",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function getPreviousMonthCycle(year: number, month: number) {
  if (month === 1) {
    return {
      year: year - 1,
      month: 12,
    };
  }

  return {
    year,
    month: month - 1,
  };
}

export function getDaysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

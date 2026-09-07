const twoDigits = (value) => String(value).padStart(2, "0");

export function monthKey(year, month) {
  return `${year}-${twoDigits(month + 1)}`;
}

export function dateKey(year, month, day) {
  return `${monthKey(year, month)}-${twoDigits(day)}`;
}

export function monthBounds(year, month) {
  const next = new Date(year, month + 1, 1);
  return {
    start: dateKey(year, month, 1),
    end: dateKey(next.getFullYear(), next.getMonth(), 1),
  };
}

export function monthLabel(year, month) {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(year, month, 1));
}

export function calendarCells(year, month) {
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  return [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: days }, (_, index) => ({ day: index + 1, date: dateKey(year, month, index + 1) })),
  ];
}

export function shiftedMonth(year, month, offset) {
  const next = new Date(year, month + offset, 1);
  return { year: next.getFullYear(), month: next.getMonth() };
}

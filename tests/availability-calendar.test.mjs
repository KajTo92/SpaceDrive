import test from "node:test";
import assert from "node:assert/strict";
import { calendarCells, dateKey, monthBounds, shiftedMonth } from "../shared/availability-calendar.js";

test("calendar uses Monday as the first weekday", () => {
  const september = calendarCells(2026, 8);
  assert.equal(september.filter((cell) => cell === null).length, 1);
  assert.deepEqual(september[1], { day: 1, date: "2026-09-01" });
  assert.deepEqual(september.at(-1), { day: 30, date: "2026-09-30" });
});

test("calendar navigation crosses year boundaries", () => {
  assert.deepEqual(shiftedMonth(2026, 11, 1), { year: 2027, month: 0 });
  assert.deepEqual(shiftedMonth(2026, 0, -1), { year: 2025, month: 11 });
});

test("month bounds use an exclusive next-month date", () => {
  assert.equal(dateKey(2026, 8, 7), "2026-09-07");
  assert.deepEqual(monthBounds(2026, 8), { start: "2026-09-01", end: "2026-10-01" });
});

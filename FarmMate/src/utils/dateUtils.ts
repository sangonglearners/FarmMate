export type CalDate = Date;

export function startOfWeek(d: CalDate): CalDate {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // 월=0
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfWeek(d: CalDate): CalDate {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(e.getDate() + 7);
  e.setHours(0, 0, 0, 0); // exclusive
  return e;
}

export function clampIntervalToWeek(
  start: CalDate,
  end: CalDate,
  weekStart: CalDate,
  weekEnd: CalDate
) {
  const s = new Date(Math.max(start.getTime(), weekStart.getTime()));
  const e = new Date(Math.min(end.getTime(), weekEnd.getTime()));
  return s < e ? { start: s, end: e } : null;
}

export function dayIndexInWeek(d: CalDate, weekStart: CalDate) {
  const ms = d.getTime() - weekStart.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000)); // 0..6
}

export function columnAndSpan(
  clampedStart: CalDate,
  clampedEnd: CalDate,
  weekStart: CalDate
) {
  const colStart = dayIndexInWeek(clampedStart, weekStart) + 1; // CSS grid is 1-indexed
  // end exclusive, span is number of days covered
  const span = Math.max(
    1,
    dayIndexInWeek(new Date(clampedEnd.getTime() - 1), weekStart) -
      dayIndexInWeek(clampedStart, weekStart) +
      1
  );
  return { colStart, span };
}

export function isVisualStart(originalStart: CalDate, weekStart: CalDate) {
  return originalStart >= weekStart;
}

export function isVisualEnd(originalEnd: CalDate, weekEnd: CalDate) {
  return originalEnd <= weekEnd;
}


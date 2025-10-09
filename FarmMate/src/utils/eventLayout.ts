export type Event = { id: string; title: string; start: Date; end: Date };

export type Positioned = Event & {
  row: number;
  colStart: number;
  span: number;
  visualStart: boolean;
  visualEnd: boolean;
};

/** 간단한 라인스위핑: 같은 행에서 겹치지 않게 배치 */
export function placeEvents(
  events: Event[],
  weekStart: Date,
  weekEnd: Date,
  helpers: any
): Positioned[] {
  const items = [];
  for (const ev of events) {
    const clamped = helpers.clampIntervalToWeek(ev.start, ev.end, weekStart, weekEnd);
    if (!clamped) continue;
    const { colStart, span } = helpers.columnAndSpan(clamped.start, clamped.end, weekStart);
    items.push({
      ...ev,
      colStart,
      span,
      visualStart: helpers.isVisualStart(ev.start, weekStart),
      visualEnd: helpers.isVisualEnd(ev.end, weekEnd),
    });
  }
  // 행 배치
  const rows: Positioned[][] = [];
  for (const it of items.sort((a, b) => a.colStart - b.colStart || b.span - a.span)) {
    let placed = false;
    for (let r = 0; r < rows.length; r++) {
      if (!rows[r].some((e) => overlaps(e, it))) {
        rows[r].push(it);
        (it as any).row = r;
        placed = true;
        break;
      }
    }
    if (!placed) {
      (it as any).row = rows.length;
      rows.push([it]);
    }
  }
  return items as Positioned[];
}

function overlaps(a: Positioned, b: Positioned) {
  const aStart = a.colStart,
    aEnd = a.colStart + a.span; // end exclusive
  const bStart = b.colStart,
    bEnd = b.colStart + b.span;
  return aStart < bEnd && bStart < aEnd;
}


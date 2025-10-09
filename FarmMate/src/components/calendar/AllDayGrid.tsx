import React from "react";
import { EventPill } from "./EventPill";
import * as DU from "../../utils/dateUtils";
import { placeEvents } from "../../utils/eventLayout";

type Event = { id: string; title: string; start: Date; end: Date };

export function AllDayGrid({ date, events }: { date: Date; events: Event[] }) {
  const weekStart = DU.startOfWeek(date);
  const weekEnd = DU.endOfWeek(date);

  const positioned = placeEvents(events, weekStart, weekEnd, {
    clampIntervalToWeek: DU.clampIntervalToWeek,
    columnAndSpan: DU.columnAndSpan,
    isVisualStart: DU.isVisualStart,
    isVisualEnd: DU.isVisualEnd,
  });

  const rows = Math.max(1, Math.max(...positioned.map((p) => p.row), 0) + 1);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 text-xs text-gray-500 mb-1">
          {Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(weekStart);
            d.setDate(d.getDate() + i);
            return (
              <div key={i} className="px-2">
                {d.toLocaleDateString(undefined, {
                  month: "numeric",
                  day: "numeric",
                  weekday: "short",
                })}
              </div>
            );
          })}
        </div>

        {/* all-day rows */}
        <div className="relative">
          {Array.from({ length: rows }).map((_, r) => (
            <div key={r} className="grid grid-cols-7 gap-x-2 h-10 mb-1" />
          ))}

          {positioned.map((ev) => (
            <div
              key={ev.id}
              className="absolute left-0 right-0"
              style={{
                top: ev.row * 40, // 40px per row (h-10)
              }}
            >
              <div className="grid grid-cols-7 gap-x-2">
                <div
                  style={{
                    gridColumnStart: ev.colStart,
                    gridColumnEnd: `span ${ev.span}`,
                  }}
                >
                  <EventPill
                    title={ev.title}
                    visualStart={ev.visualStart}
                    visualEnd={ev.visualEnd}
                  />
                </div>
              </div>
            </div>
          ))}

          {/* 그리드 배경선 */}
          <div className="grid grid-cols-7 absolute inset-0 pointer-events-none">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="border border-gray-100" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


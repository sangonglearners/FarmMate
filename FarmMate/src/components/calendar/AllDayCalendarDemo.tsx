import React from "react";
import { AllDayGrid } from "./AllDayGrid";

const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
const toDate = (s: string) => new Date(s); // ISO 사용

export default function AllDayCalendarDemo() {
  const date = new Date("2025-10-10T00:00:00");

  const events = [
    {
      id: "e1",
      title: "맘_파종",
      start: toDate("2025-10-10T00:00:00"),
      end: toDate("2025-10-12T00:00:00"),
    }, // 10/10~10/11 (end exclusive 10/12)
    {
      id: "e2",
      title: "긴 일정",
      start: toDate("2025-10-09T00:00:00"),
      end: toDate("2025-10-13T00:00:00"),
    },
    {
      id: "e3",
      title: "하루",
      start: toDate("2025-10-10T00:00:00"),
      end: toDate("2025-10-11T00:00:00"),
    },
  ];

  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold mb-3">종일 일정 (All-day)</h1>
      <AllDayGrid date={date} events={events} />
      <p className="text-xs text-gray-500 mt-2">타임존: {tz}</p>
    </div>
  );
}


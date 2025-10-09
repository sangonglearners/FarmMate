import React from "react";

export function EventPill(props: {
  title: string;
  visualStart: boolean;
  visualEnd: boolean;
}) {
  const { title, visualStart, visualEnd } = props;

  // 양끝 둥글림 제어
  const radius =
    visualStart && visualEnd
      ? "rounded-xl"
      : visualStart
      ? "rounded-l-xl"
      : visualEnd
      ? "rounded-r-xl"
      : "rounded-none";

  return (
    <div
      className={`h-8 px-2 text-sm flex items-center bg-blue-100 text-blue-900 border border-blue-200 ${radius} shadow-sm`}
    >
      <span className="truncate">{title}</span>
    </div>
  );
}


// Calendar widget utility functions
import type { Task, Crop } from "@shared/types/schema";

export const getTaskColor = (taskType: string) => {
  switch (taskType) {
    case "파종":
      return "bg-blue-200 text-blue-800";
    case "육묘":
      return "bg-green-200 text-green-800";
    case "수확-선별":
      return "bg-orange-200 text-orange-800";
    case "저장-포장":
      return "bg-purple-200 text-purple-800";
    default:
      return "bg-gray-200 text-gray-800";
  }
};

export const getTasksForDate = (tasks: Task[], date: Date, day: number) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return tasks.filter(task => task.scheduledDate === dateStr);
};

export const getCropName = (crops: Crop[], cropId: string | null | undefined) => {
  if (!cropId) return "";
  const crop = crops.find(c => c.id === cropId);
  return crop ? crop.name : "";
};

export const isToday = (date: Date, day: number) => {
  const today = new Date();
  return (
    today.getDate() === day &&
    today.getMonth() === date.getMonth() &&
    today.getFullYear() === date.getFullYear()
  );
};

export const getCalendarDays = (currentDate: Date) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  
  // 오늘을 기준으로 2주 표시 (14일)
  const days = [];
  
  // 오늘부터 13일 후까지 (총 14일)
  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    days.push(date.getDate());
  }
  
  return days;
};

export const weekDays = ['월', '화', '수', '목', '금', '토', '일'];
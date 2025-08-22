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
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDay = firstDay.getDay();
  
  // Create calendar grid
  const days = [];
  
  // Add empty cells for days before month starts
  for (let i = 0; i < (startingDay === 0 ? 6 : startingDay - 1); i++) {
    days.push(null);
  }
  
  // Add days of month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }
  
  return days;
};

export const weekDays = ['월', '화', '수', '목', '금', '토', '일'];
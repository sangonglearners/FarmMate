// Task entity pure utility functions

export const getTaskColor = (taskType: string) => {
  switch (taskType) {
    case "파종":
      return "bg-blue-100 text-blue-800";
    case "육묘":
      return "bg-green-100 text-green-800";
    case "수확-선별":
      return "bg-orange-100 text-orange-800";
    case "저장-포장":
      return "bg-purple-100 text-purple-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const getTaskIcon = (taskType: string) => {
  switch (taskType) {
    case "파종":
      return "🌱";
    case "육묘":
      return "🌿";
    case "수확-선별":
      return "🥬";
    case "저장-포장":
      return "📦";
    default:
      return "🚜";
  }
};

export const getTaskPriority = (scheduledDate: string) => {
  const today = new Date();
  const taskDate = new Date(scheduledDate);
  const diffTime = taskDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return "overdue";
  if (diffDays === 0) return "today";
  if (diffDays <= 3) return "soon";
  return "future";
};

export const formatTaskDate = (date: string) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
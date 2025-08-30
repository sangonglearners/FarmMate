// 임시로 로컬 스토리지에 저장하는 함수
export async function saveTask(input: {
  title: string; memo?: string; scheduledAt?: string; farmId?: number; cropId?: number; taskType?: string;
}) {
  // 기존 작업 목록 가져오기
  const storedTasks = localStorage.getItem("farmmate-tasks");
  const tasks = storedTasks ? JSON.parse(storedTasks) : [];
  
  // 새 작업 생성
  const newTask = {
    id: Date.now().toString(), // 임시 ID
    title: input.title,
    description: input.memo || "",
    taskType: input.taskType || "기타",
    scheduledDate: input.scheduledAt || new Date().toISOString().split('T')[0],
    completed: 0,
    farmId: input.farmId?.toString() || "",
    cropId: input.cropId?.toString() || "",
    userId: "test-user-id",
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
  
  // 작업 목록에 추가
  tasks.push(newTask);
  
  // 로컬 스토리지에 저장
  localStorage.setItem("farmmate-tasks", JSON.stringify(tasks));
  
  return newTask;
}

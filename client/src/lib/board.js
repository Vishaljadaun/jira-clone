export const statuses = ["To Do", "In Progress", "Done"];
export const priorities = ["Low", "Medium", "High"];
export function overdue(task, today = new Date().toLocaleDateString("en-CA")) {
  return Boolean(
    task.dueDate && task.dueDate < today && task.status !== "Done",
  );
}
export function filterTasks(
  tasks,
  { search = "", priority = "", assignee = "", late = false },
  today,
) {
  const query = search.trim().toLowerCase();
  return tasks.filter(
    (t) =>
      (!query ||
        `${t.title} ${t.description || ""}`.toLowerCase().includes(query)) &&
      (!priority || t.priority === priority) &&
      (!assignee ||
        (assignee === "unassigned"
          ? !t.assignee
          : (t.assignee?._id || t.assignee) === assignee)) &&
      (!late || overdue(t, today)),
  );
}
export function tasksCsv(tasks) {
  const cell = (v) =>
    `"${String(v ?? "")
      .replace(/^[\s]*[=+@-]/, "'$&")
      .replace(/"/g, '""')}"`;
  return [
    ["Title", "Status", "Priority", "Assignee", "Due date", "Description"],
    ...tasks.map((t) => [
      t.title,
      t.status,
      t.priority,
      t.assignee?.name || "",
      t.dueDate || "",
      t.description || "",
    ]),
  ]
    .map((row) => row.map(cell).join(","))
    .join("\r\n");
}

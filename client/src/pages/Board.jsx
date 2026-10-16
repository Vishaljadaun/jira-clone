import { useEffect, useState, useContext, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { io } from "socket.io-client";
import AuthContext from "../context/auth";
import Navbar from "../components/Navbar";
import Dialog from "../components/Dialog";
import { api, auth, message, serverUrl } from "../lib/api";
import {
  statuses,
  priorities,
  overdue,
  filterTasks,
  tasksCsv,
} from "../lib/board";
const blank = {
  title: "",
  description: "",
  priority: "Medium",
  status: "To Do",
  assignee: "",
  dueDate: "",
};
export default function Board() {
  const { id } = useParams();
  return <ProjectBoard key={id} id={id} />;
}
function ProjectBoard({ id }) {
  const { user } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [live, setLive] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    priority: "",
    assignee: "",
    late: false,
  });
  const [editor, setEditor] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [invite, setInvite] = useState(false);
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const requestNumber = useRef(0);
  const load = useCallback(async () => {
    const request = ++requestNumber.current;
    try {
      const [taskResponse, projectResponse] = await Promise.all([
        api.get(`/api/tasks/${id}`, auth(user)),
        api.get(`/api/projects/${id}`, auth(user)),
      ]);
      if (request !== requestNumber.current) return;
      setTasks(taskResponse.data);
      setProject(projectResponse.data);
      setError("");
    } catch (e) {
      if (request === requestNumber.current) setError(message(e));
    } finally {
      if (request === requestNumber.current) setLoading(false);
    }
  }, [id, user]);
  useEffect(() => {
    let active = true;
    const counter = requestNumber;
    const socket = io(serverUrl || window.location.origin, {
      auth: { token: user.token },
    });
    socket.on("connect", () =>
      socket.emit("joinProject", id, (reply) => {
        if (active) {
          setLive(Boolean(reply.ok));
          load();
        }
      }),
    );
    socket.on("disconnect", () => setLive(false));
    socket.on("connect_error", () => setLive(false));
    socket.on("taskUpdated", load);
    socket.on("projectUpdated", load);
    const timer = setTimeout(load, 0);
    return () => {
      active = false;
      clearTimeout(timer);
      counter.current++;
      socket.disconnect();
    };
  }, [id, user.token, load]);
  const members = project
    ? [
        ...new Map(
          [project.owner, ...project.members]
            .filter(Boolean)
            .map((m) => [m._id, m]),
        ).values(),
      ]
    : [];
  const visible = filterTasks(tasks, filters);
  const selected = tasks.find((t) => t._id === selectedId);
  const done = tasks.filter((t) => t.status === "Done").length;
  const owner = project?.owner?._id === user._id;
  const openEditor = (task) => {
    setEditor(
      task
        ? {
            ...task,
            assignee: task.assignee?._id || "",
            dueDate: task.dueDate || "",
          }
        : { ...blank },
    );
    setSelectedId(null);
    setFormError("");
  };
  const run = async (action, close) => {
    if (busy) return;
    setBusy(true);
    setFormError("");
    try {
      await action();
      await load();
      close?.();
    } catch (e) {
      setFormError(message(e));
      if (e.response?.status === 409) await load();
    } finally {
      setBusy(false);
    }
  };
  const save = (e) => {
    e.preventDefault();
    run(
      () =>
        editor._id
          ? api.put(
              `/api/tasks/update/${editor._id}`,
              { ...editor, version: editor.__v },
              auth(user),
            )
          : api.post("/api/tasks", { ...editor, projectId: id }, auth(user)),
      () => setEditor(null),
    );
  };
  const move = async ({ destination, source, draggableId }) => {
    if (!destination || source.droppableId === destination.droppableId || busy)
      return;
    const task = tasks.find((t) => t._id === draggableId);
    setBusy(true);
    try {
      await api.put(
        `/api/tasks/update/${task._id}`,
        { status: destination.droppableId, version: task.__v },
        auth(user),
      );
      await load();
    } catch (e) {
      await load();
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };
  const exportCsv = () => {
    const url = URL.createObjectURL(
      new Blob(["\uFEFF", tasksCsv(visible)], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "project-tasks.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const field = (name, value) => setFilters((f) => ({ ...f, [name]: value }));
  return (
    <div className="workspace">
      <Navbar />
      <main className="board-main">
        <Link className="back-link" to="/project">
          ← All projects
        </Link>
        <header className="board-heading">
          <div>
            <p className="eyebrow">TEAM WORKSPACE</p>
            <h1>{project?.name || "Project board"}</h1>
            <p className="muted">
              {project?.description || "Plan clearly. Keep work moving."}
            </p>
            <span className={`connection ${live ? "connected" : ""}`}>
              {live
                ? "Live updates connected"
                : "Live updates offline — refresh to sync"}
            </span>
          </div>
          <div className="actions">
            <button className="secondary" onClick={load}>
              Refresh
            </button>
            {owner && (
              <button
                className="secondary"
                onClick={() => {
                  setInvite(true);
                  setFormError("");
                }}
              >
                Add member
              </button>
            )}
            <button
              className="primary"
              disabled={!project}
              onClick={() => openEditor()}
            >
              + Add task
            </button>
          </div>
        </header>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <section className="stats" aria-label="Project progress">
          <div>
            <strong>{tasks.length}</strong>
            <span>Total tasks</span>
          </div>
          <div>
            <strong>
              {tasks.filter((t) => t.status === "In Progress").length}
            </strong>
            <span>In progress</span>
          </div>
          <div>
            <strong>{tasks.filter((t) => overdue(t)).length}</strong>
            <span>Overdue</span>
          </div>
          <div>
            <strong>
              {tasks.length ? Math.round((done / tasks.length) * 100) : 0}%
            </strong>
            <span>Completed · {done} tasks</span>
          </div>
        </section>
        <section className="filters" aria-label="Task filters">
          <label className="search-field">
            Search tasks
            <input
              type="search"
              placeholder="Search title or description…"
              value={filters.search}
              onChange={(e) => field("search", e.target.value)}
            />
          </label>
          <label>
            Priority
            <select
              value={filters.priority}
              onChange={(e) => field("priority", e.target.value)}
            >
              <option value="">All priorities</option>
              {priorities.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label>
            Assignee
            <select
              value={filters.assignee}
              onChange={(e) => field("assignee", e.target.value)}
            >
              <option value="">Everyone</option>
              <option value="unassigned">Unassigned</option>
              {members.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={filters.late}
              onChange={(e) => field("late", e.target.checked)}
            />
            Overdue only
          </label>
          <button
            className="secondary"
            onClick={() =>
              setFilters({
                search: "",
                priority: "",
                assignee: user._id,
                late: false,
              })
            }
          >
            My tasks
          </button>
          <button
            className="text-button"
            onClick={() =>
              setFilters({
                search: "",
                priority: "",
                assignee: "",
                late: false,
              })
            }
          >
            Clear
          </button>
          <button
            className="secondary"
            disabled={!visible.length}
            onClick={exportCsv}
          >
            Export CSV
          </button>
        </section>
        <p className="result-count" aria-live="polite">
          {loading
            ? "Loading your board…"
            : `${visible.length} of ${tasks.length} tasks shown · Export includes the current filters`}
        </p>
        <DragDropContext onDragEnd={move}>
          <div className="kanban">
            {statuses.map((status, column) => (
              <section className={`column column-${column}`} key={status}>
                <h2>
                  <span className="column-dot" />
                  {status}
                  <span className="count">
                    {visible.filter((t) => t.status === status).length}
                  </span>
                </h2>
                <Droppable droppableId={status}>
                  {(provided) => (
                    <div
                      className="task-list"
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                    >
                      {visible
                        .filter((t) => t.status === status)
                        .map((task, index) => (
                          <Draggable
                            key={task._id}
                            draggableId={task._id}
                            index={index}
                            isDragDisabled={busy}
                          >
                            {(drag) => (
                              <article
                                className="task-card"
                                ref={drag.innerRef}
                                {...drag.draggableProps}
                              >
                                <div className="card-top">
                                  <span
                                    className={`priority priority-${task.priority.toLowerCase()}`}
                                  >
                                    {task.priority}
                                  </span>
                                  <span
                                    {...drag.dragHandleProps}
                                    aria-label={`Move ${task.title}`}
                                    className="drag-handle"
                                  >
                                    ⠿
                                  </span>
                                </div>
                                <button
                                  className="task-title"
                                  onClick={() => {
                                    setSelectedId(task._id);
                                    setComment("");
                                    setFormError("");
                                  }}
                                >
                                  {task.title}
                                </button>
                                {task.description && (
                                  <p className="task-description">
                                    {task.description}
                                  </p>
                                )}
                                <footer>
                                  <span>
                                    {task.assignee?.name || "Unassigned"}
                                  </span>
                                  <span>
                                    {task.comments?.length || 0} comments
                                  </span>
                                </footer>
                                {task.dueDate && (
                                  <p
                                    className={
                                      overdue(task) ? "due late" : "due"
                                    }
                                  >
                                    {overdue(task) ? "Overdue · " : "Due · "}
                                    {task.dueDate}
                                  </p>
                                )}
                              </article>
                            )}
                          </Draggable>
                        ))}
                      {provided.placeholder}
                      {!visible.some((t) => t.status === status) && (
                        <p className="empty-column">
                          {tasks.length
                            ? "No matching tasks"
                            : "Your next task starts here"}
                        </p>
                      )}
                    </div>
                  )}
                </Droppable>
              </section>
            ))}
          </div>
        </DragDropContext>
        {editor && (
          <Dialog
            title={editor._id ? "Edit task" : "Create task"}
            onClose={() => !busy && setEditor(null)}
          >
            <form onSubmit={save} className="form-stack">
              <label>
                Title
                <input
                  required
                  maxLength={200}
                  autoFocus
                  value={editor.title}
                  onChange={(e) =>
                    setEditor({ ...editor, title: e.target.value })
                  }
                />
              </label>
              <label>
                Description
                <textarea
                  rows={4}
                  maxLength={5000}
                  value={editor.description || ""}
                  onChange={(e) =>
                    setEditor({ ...editor, description: e.target.value })
                  }
                />
              </label>
              <div className="form-grid">
                <label>
                  Status
                  <select
                    value={editor.status}
                    onChange={(e) =>
                      setEditor({ ...editor, status: e.target.value })
                    }
                  >
                    {statuses.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Priority
                  <select
                    value={editor.priority}
                    onChange={(e) =>
                      setEditor({ ...editor, priority: e.target.value })
                    }
                  >
                    {priorities.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Assignee
                  <select
                    value={editor.assignee}
                    onChange={(e) =>
                      setEditor({ ...editor, assignee: e.target.value })
                    }
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Due date
                  <input
                    type="date"
                    value={editor.dueDate}
                    onChange={(e) =>
                      setEditor({ ...editor, dueDate: e.target.value })
                    }
                  />
                </label>
              </div>
              {formError && (
                <div role="alert" className="error">
                  {formError}
                  {editor._id && (
                    <button
                      type="button"
                      className="text-button"
                      onClick={() =>
                        openEditor(tasks.find((t) => t._id === editor._id))
                      }
                    >
                      Reload saved task (discard edits)
                    </button>
                  )}
                </div>
              )}
              <div className="actions">
                <button
                  type="button"
                  className="secondary"
                  disabled={busy}
                  onClick={() => setEditor(null)}
                >
                  Cancel
                </button>
                <button className="primary" disabled={busy}>
                  {busy ? "Saving…" : "Save task"}
                </button>
              </div>
            </form>
          </Dialog>
        )}
        {selected && (
          <Dialog
            title={selected.title}
            onClose={() => !busy && setSelectedId(null)}
          >
            <div className="form-stack">
              <p className="muted">
                {selected.status} · {selected.priority} priority ·{" "}
                {selected.assignee?.name || "Unassigned"}
              </p>
              <p className="preserve-text">
                {selected.description || "No description yet."}
              </p>
              {selected.dueDate && <p>Due {selected.dueDate}</p>}
              <div className="actions">
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => openEditor(selected)}
                >
                  Edit task
                </button>
                {(owner ||
                  (selected.reporter?._id || selected.reporter) ===
                    user._id) && (
                  <button
                    className="danger"
                    disabled={busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          "Delete this task and its comments? This cannot be undone.",
                        )
                      )
                        run(
                          () =>
                            api.delete(`/api/tasks/update/${selected._id}`, {
                              ...auth(user),
                              data: { version: selected.__v },
                            }),
                          () => setSelectedId(null),
                        );
                    }}
                  >
                    Delete task
                  </button>
                )}
              </div>
              <h3>Discussion</h3>
              <div className="comments">
                {selected.comments?.map((c) => (
                  <article key={c._id}>
                    <strong>{c.user?.name || "Former member"}</strong>
                    <time>{new Date(c.createdAt).toLocaleString()}</time>
                    <p className="preserve-text">{c.text}</p>
                  </article>
                ))}
                {!selected.comments?.length && (
                  <p className="muted">Start the discussion with your team.</p>
                )}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  run(
                    () =>
                      api.post(
                        `/api/tasks/${selected._id}/comments`,
                        { text: comment },
                        auth(user),
                      ),
                    () => setComment(""),
                  );
                }}
              >
                <label>
                  Add a comment
                  <textarea
                    required
                    maxLength={2000}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </label>
                <button className="primary" disabled={busy || !comment.trim()}>
                  {busy ? "Posting…" : "Post comment"}
                </button>
              </form>
              {formError && (
                <p role="alert" className="error">
                  {formError}
                </p>
              )}
            </div>
          </Dialog>
        )}
        {invite && (
          <Dialog
            title="Add a project member"
            onClose={() => !busy && setInvite(false)}
          >
            <form
              className="form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                run(
                  () =>
                    api.put(
                      `/api/projects/${id}/add-member`,
                      { email },
                      auth(user),
                    ),
                  () => {
                    setInvite(false);
                    setEmail("");
                  },
                );
              }}
            >
              <p className="muted">
                Add someone who has already registered. No invitation email is
                sent.
              </p>
              <label>
                Email
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              {formError && (
                <p role="alert" className="error">
                  {formError}
                </p>
              )}
              <button className="primary" disabled={busy}>
                {busy ? "Adding…" : "Add member"}
              </button>
            </form>
          </Dialog>
        )}
      </main>
    </div>
  );
}

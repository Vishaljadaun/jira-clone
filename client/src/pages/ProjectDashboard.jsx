import { useEffect, useState, useContext } from "react";
import { Link } from "react-router-dom";
import AuthContext from "../context/auth";
import Navbar from "../components/Navbar";
import Dialog from "../components/Dialog";
import { api, auth, message } from "../lib/api";
export default function ProjectDashboard() {
  const { user } = useContext(AuthContext);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [form, setForm] = useState(null);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    api
      .get("/api/projects", auth(user))
      .then(({ data }) => {
        if (active) {
          setProjects(data);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(message(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user, attempt]);
  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    setFormError("");
    try {
      const { data } = await api.post("/api/projects", form, auth(user));
      setProjects((p) => [data, ...p]);
      setForm(null);
    } catch (e) {
      setFormError(message(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="workspace">
      <Navbar />
      <main className="board-main">
        <header className="board-heading">
          <div>
            <p className="eyebrow">YOUR WORKSPACE</p>
            <h1>Make room for great work.</h1>
            <p className="muted">
              One place for your projects, people and next steps.
            </p>
          </div>
          <button
            className="primary"
            onClick={() => {
              setForm({ name: "", description: "" });
              setFormError("");
            }}
          >
            + Create project
          </button>
        </header>
        {error && (
          <div className="error" role="alert">
            {error}
            <button
              className="text-button"
              onClick={() => setAttempt((a) => a + 1)}
            >
              Retry
            </button>
          </div>
        )}
        {loading ? (
          <p>Loading projects…</p>
        ) : (
          <>
            <p className="result-count">
              {projects.length} projects · Open a board to see what’s next
            </p>
            <div className="project-grid">
              {projects.map((p) => (
                <Link
                  to={`/project/${p._id}`}
                  className="project-card"
                  key={p._id}
                >
                  <span className="project-icon">
                    {p.name.slice(0, 2).toUpperCase()}
                  </span>
                  <h2>{p.name}</h2>
                  <p>
                    {p.description ||
                      "A fresh space for your team’s next idea."}
                  </p>
                  <footer>
                    <span>
                      {(p.owner?._id || p.owner) === user._id
                        ? "Owner"
                        : "Member"}{" "}
                      · {p.members?.length || 1} people
                    </span>
                    <span>Open board →</span>
                  </footer>
                </Link>
              ))}
            </div>
            {!projects.length && !error && (
              <p className="empty-column">
                Create your first project, add tasks, and invite your team.
              </p>
            )}
          </>
        )}
        {form && (
          <Dialog
            title="Create a project"
            onClose={() => !busy && setForm(null)}
          >
            <form onSubmit={create} className="form-stack">
              <label>
                Project name
                <input
                  required
                  autoFocus
                  maxLength={120}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label>
                Description
                <textarea
                  maxLength={2000}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </label>
              {formError && (
                <p className="error" role="alert">
                  {formError}
                </p>
              )}
              <button className="primary" disabled={busy}>
                {busy ? "Creating…" : "Create project"}
              </button>
            </form>
          </Dialog>
        )}
      </main>
    </div>
  );
}

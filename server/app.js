const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const { authenticate } = require("./middleware/authMiddleware");
const { projectAccess } = require("./services/access");
function createServer() {
  const app = express();
  const origins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((x) => x.trim());
  app.use(cors({ origin: origins }));
  app.use(express.json({ limit: "100kb" }));
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: origins } });
  app.set("io", io);
  io.use(async (socket, next) => {
    try {
      socket.user = await authenticate(socket.handshake.auth?.token);
      next();
    } catch {
      next(new Error("Please sign in again."));
    }
  });
  io.on("connection", (socket) => {
    socket.on("joinProject", async (id, reply) => {
      try {
        const user = await authenticate(socket.handshake.auth?.token);
        await projectAccess(id, user._id);
        await socket.join(String(id));
        if (typeof reply === "function") reply({ ok: true });
      } catch {
        if (typeof reply === "function") reply({ ok: false });
      }
    });
    // Only saved server mutations emit events. Clients cannot broadcast task data.
  });
  app.get("/health", (req, res) => res.json({ status: "ok" }));
  app.get("/", (req, res) => res.json({ message: "Jira Clone API" }));
  for (const name of ["user", "project", "task", "upload"])
    app.use(
      `/api/${name === "upload" ? name : name + "s"}`,
      require(`./routes/${name}Routes`),
    );
  app.use(
    "/uploads",
    express.static(path.join(__dirname, "uploads"), {
      setHeaders: (res) => res.set("X-Content-Type-Options", "nosniff"),
    }),
  );
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status =
      error.name === "VersionError"
        ? 409
        : error.code === 11000
          ? 409
          : ["ValidationError", "CastError", "MulterError"].includes(error.name)
            ? 400
            : error.status || (res.statusCode >= 400 ? res.statusCode : 500);
    res
      .status(status)
      .json({
        message:
          status === 500
            ? "Unable to complete the request."
            : error.name === "VersionError"
              ? "This task changed. Reload and try again."
              : error.code === 11000
                ? "This record already exists."
                : error.message,
      });
  });
  return { app, server, io };
}
module.exports = { createServer };

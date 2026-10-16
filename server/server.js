require("dotenv").config();
const connectDB = require("./config/db");
const { createServer } = require("./app");
async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)
    throw new Error(
      "Set JWT_SECRET to a private random value of at least 32 characters.",
    );
  await connectDB();
  const { server } = createServer();
  server.listen(process.env.PORT || 5000, () =>
    console.log("Jira Clone API is ready."),
  );
}
start().catch(() => {
  console.error(
    "Startup failed. Check database and private environment configuration.",
  );
  process.exit(1);
});

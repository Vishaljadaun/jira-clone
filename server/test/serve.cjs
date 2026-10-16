// Isolated browser-test process. Never reads the application's .env file.
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
process.env.JWT_SECRET = "browser-test-disposable-secret-not-for-deployment";
process.env.CLIENT_ORIGIN = "http://localhost:5173";
const { createServer } = require("../app");
(async () => {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  const { server, io } = createServer();
  server.listen(5000, "127.0.0.1");
  const stop = async () => {
    io.close();
    server.close();
    await mongoose.disconnect();
    await mongo.stop();
    process.exit(0);
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
})();

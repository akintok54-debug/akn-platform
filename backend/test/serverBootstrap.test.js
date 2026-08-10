const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const originalMongoUri = process.env.MONGO_URI;
const originalPort = process.env.PORT;

test("server should start and expose health endpoint without a configured MongoDB URI", async () => {
  delete process.env.MONGO_URI;
  process.env.PORT = String(5601 + Math.floor(Math.random() * 200));

  const { startServer } = require("../server");
  let server;

  try {
    server = await startServer({ port: Number(process.env.PORT) });

    const response = await fetch(`http://127.0.0.1:${process.env.PORT}/api/health`);
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.success, true);
    assert.ok(payload.message);
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect().catch(() => {});
    if (originalMongoUri === undefined) {
      delete process.env.MONGO_URI;
    } else {
      process.env.MONGO_URI = originalMongoUri;
    }
    if (originalPort === undefined) {
      delete process.env.PORT;
    } else {
      process.env.PORT = originalPort;
    }
  }
});

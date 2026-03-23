const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const app = require("../src/app");

async function run() {
  const server = app.listen(0);
  const { port } = server.address();
  const base = `http://localhost:${port}`;
  const headers = { "Content-Type": "application/json" };

  try {
    const healthRes = await fetch(`${base}/health`);
    const health = await healthRes.json();
    console.log("/health =>", health);

    const sample = {
      fecha: "2026-03-22",
      hora: "10:30",
      nombre: "Test API",
      valor: 50000,
      ganancia: 20000,
      detalles: "Smoke test",
    };

    const createRes = await fetch(`${base}/api/turnos`, {
      method: "POST",
      headers,
      body: JSON.stringify(sample),
    });
    const created = await createRes.json();
    console.log("POST /api/turnos =>", createRes.status, created.data?.id);

    const listRes = await fetch(`${base}/api/turnos`);
    const list = await listRes.json();
    console.log("GET /api/turnos =>", list.data?.length, "turnos");

    if (created.data?.id) {
      const deleteRes = await fetch(`${base}/api/turnos/${created.data.id}`, {
        method: "DELETE",
      });
      console.log("DELETE /api/turnos/:id =>", deleteRes.status);
    }
  } catch (error) {
    console.error("Smoke test failed:", error);
    process.exitCode = 1;
  } finally {
    server.close();
  }
}

run();

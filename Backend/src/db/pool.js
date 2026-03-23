const { Pool } = require("pg");
const config = require("../config");

if (!config.databaseUrl) {
  throw new Error("DATABASE_URL no está configurada. Crea un archivo .env tomando como base .env.example.");
}

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: { rejectUnauthorized: false },
});

pool.on("error", (err) => {
  console.error("Error inesperado en el pool de Postgres", err);
});

module.exports = pool;

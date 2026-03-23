const pool = require("../db/pool");
const { normalizeNumber } = require("../utils/validators");

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "");
}

async function calcularGanancias(req, res, next) {
  try {
    const { desde, hasta } = req.query;

    if (!isValidDate(desde) || !isValidDate(hasta)) {
      return res.status(400).json({ error: "Los parámetros 'desde' y 'hasta' son obligatorios (YYYY-MM-DD)." });
    }

    if (desde > hasta) {
      return res.status(400).json({ error: "'desde' no puede ser mayor que 'hasta'." });
    }

    const { rows } = await pool.query(
      `SELECT * FROM turnos
       WHERE fecha BETWEEN $1 AND $2
       ORDER BY fecha ASC, hora ASC`,
      [desde, hasta]
    );

    const totalTurnos = rows.length;
    const totalCobrado = rows.reduce((acc, row) => acc + normalizeNumber(row.valor), 0);
    const totalGanancia = rows.reduce((acc, row) => acc + normalizeNumber(row.ganancia), 0);

    res.json({
      data: {
        totalTurnos,
        totalCobrado,
        totalGanancia,
        detalle: rows,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  calcularGanancias,
};

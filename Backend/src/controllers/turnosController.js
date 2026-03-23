const pool = require("../db/pool");
const { validateTurnoPayload } = require("../utils/validators");

async function listarTurnos(req, res, next) {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM turnos ORDER BY fecha ASC, hora ASC"
    );
    res.json({ data: rows });
  } catch (error) {
    next(error);
  }
}

async function obtenerTurno(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await pool.query("SELECT * FROM turnos WHERE id = $1", [id]);
    if (!rows.length) {
      return res.status(404).json({ error: "Turno no encontrado" });
    }
    res.json({ data: rows[0] });
  } catch (error) {
    next(error);
  }
}

async function crearTurno(req, res, next) {
  try {
    const validation = validateTurnoPayload(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ errors: validation.errors });
    }

    const { fecha, hora, nombre, valor, ganancia, detalles } = validation.data;

    const { rows } = await pool.query(
      `INSERT INTO turnos (fecha, hora, nombre, valor, ganancia, detalles)
       VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''))
       RETURNING *`,
      [fecha, hora, nombre, valor, ganancia, detalles]
    );

    res.status(201).json({ data: rows[0] });
  } catch (error) {
    next(error);
  }
}

async function actualizarTurno(req, res, next) {
  try {
    const { id } = req.params;
    const validation = validateTurnoPayload(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ errors: validation.errors });
    }

    const { fecha, hora, nombre, valor, ganancia, detalles } = validation.data;

    const { rows } = await pool.query(
      `UPDATE turnos SET fecha = $1, hora = $2, nombre = $3,
        valor = $4, ganancia = $5, detalles = NULLIF($6, '')
       WHERE id = $7 RETURNING *`,
      [fecha, hora, nombre, valor, ganancia, detalles, id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Turno no encontrado" });
    }

    res.json({ data: rows[0] });
  } catch (error) {
    next(error);
  }
}

async function eliminarTurno(req, res, next) {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query("DELETE FROM turnos WHERE id = $1", [id]);
    if (!rowCount) {
      return res.status(404).json({ error: "Turno no encontrado" });
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listarTurnos,
  obtenerTurno,
  crearTurno,
  actualizarTurno,
  eliminarTurno,
};

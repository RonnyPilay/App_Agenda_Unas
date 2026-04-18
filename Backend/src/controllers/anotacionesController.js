const pool = require("../db/pool");
const { validateAnotacionPayload } = require("../utils/validators");

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "");
}

async function listarAnotaciones(req, res, next) {
  try {
    const { desde, hasta } = req.query;

    let query = "SELECT * FROM anotaciones_dia ORDER BY fecha ASC";
    let params = [];

    if (desde || hasta) {
      if (!isValidDate(desde) || !isValidDate(hasta)) {
        return res.status(400).json({
          error: "Los parámetros 'desde' y 'hasta' son obligatorios en formato YYYY-MM-DD.",
        });
      }

      if (desde > hasta) {
        return res.status(400).json({ error: "'desde' no puede ser mayor que 'hasta'." });
      }

      query = `SELECT * FROM anotaciones_dia
               WHERE fecha BETWEEN $1 AND $2
               ORDER BY fecha ASC`;
      params = [desde, hasta];
    }

    const { rows } = await pool.query(query, params);
    res.json({ data: rows });
  } catch (error) {
    next(error);
  }
}

async function obtenerAnotacionPorFecha(req, res, next) {
  try {
    const { fecha } = req.params;

    if (!isValidDate(fecha)) {
      return res.status(400).json({ error: "'fecha' debe tener formato YYYY-MM-DD" });
    }

    const { rows } = await pool.query("SELECT * FROM anotaciones_dia WHERE fecha = $1", [fecha]);

    if (!rows.length) {
      return res.json({ data: null });
    }

    res.json({ data: rows[0] });
  } catch (error) {
    next(error);
  }
}

async function upsertAnotacion(req, res, next) {
  try {
    const validation = validateAnotacionPayload(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ errors: validation.errors });
    }

    const {
      fecha,
      tipo,
      titulo,
      descripcion,
      totalCobrado,
      adelantos,
      propinas,
      totalNeto,
    } = validation.data;

    const { rows } = await pool.query(
      `INSERT INTO anotaciones_dia (
         fecha, tipo, titulo, descripcion, total_cobrado, adelantos, propinas, total_neto
       )
       VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''), $5, $6, $7, $8)
       ON CONFLICT (fecha)
       DO UPDATE SET
         tipo = EXCLUDED.tipo,
         titulo = EXCLUDED.titulo,
         descripcion = EXCLUDED.descripcion,
         total_cobrado = EXCLUDED.total_cobrado,
         adelantos = EXCLUDED.adelantos,
         propinas = EXCLUDED.propinas,
         total_neto = EXCLUDED.total_neto,
         updated_at = NOW()
       RETURNING *`,
      [fecha, tipo, titulo, descripcion, totalCobrado, adelantos, propinas, totalNeto]
    );

    res.status(201).json({ data: rows[0] });
  } catch (error) {
    next(error);
  }
}

async function eliminarAnotacion(req, res, next) {
  try {
    const { fecha } = req.params;

    if (!isValidDate(fecha)) {
      return res.status(400).json({ error: "'fecha' debe tener formato YYYY-MM-DD" });
    }

    const { rowCount } = await pool.query("DELETE FROM anotaciones_dia WHERE fecha = $1", [fecha]);

    if (!rowCount) {
      return res.status(404).json({ error: "No hay anotación para esa fecha" });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listarAnotaciones,
  obtenerAnotacionPorFecha,
  upsertAnotacion,
  eliminarAnotacion,
};

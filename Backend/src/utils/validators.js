function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "");
}

function isValidTime(value) {
  return /^\d{2}:\d{2}$/.test(value || "");
}

function normalizeNumber(value) {
  const cast = Number(value);
  return Number.isFinite(cast) ? cast : 0;
}

function validateTurnoPayload(payload = {}) {
  const errors = [];
  const data = {
    fecha: payload.fecha?.trim(),
    hora: payload.hora?.trim(),
    nombre: (payload.nombre || "").trim(),
    valor: normalizeNumber(payload.valor),
    ganancia: normalizeNumber(payload.ganancia),
    detalles: (payload.detalles || "").trim(),
  };

  if (!isValidDate(data.fecha)) {
    errors.push("'fecha' debe tener formato YYYY-MM-DD");
  }

  if (!isValidTime(data.hora)) {
    errors.push("'hora' debe tener formato HH:MM (24h)");
  }

  if (!data.nombre) {
    errors.push("'nombre' es obligatorio");
  }

  return {
    isValid: errors.length === 0,
    errors,
    data,
  };
}

module.exports = {
  validateTurnoPayload,
  normalizeNumber,
};

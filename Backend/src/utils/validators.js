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

const ANOTACION_TIPOS = {
  PAGO: "pago",
  FERIADO: "feriado",
  OTROS: "otros",
};

function validateAnotacionPayload(payload = {}) {
  const errors = [];
  const tipo = (payload.tipo || "").trim().toLowerCase();
  const titulo = (payload.titulo || "").trim();
  const descripcion = (payload.descripcion || "").trim();

  const data = {
    fecha: payload.fecha?.trim(),
    tipo,
    titulo,
    descripcion,
    totalCobrado: payload.totalCobrado,
    adelantos: payload.adelantos,
    propinas: payload.propinas,
    totalNeto: null,
  };

  if (!isValidDate(data.fecha)) {
    errors.push("'fecha' debe tener formato YYYY-MM-DD");
  }

  const tiposValidos = Object.values(ANOTACION_TIPOS);
  if (!tiposValidos.includes(data.tipo)) {
    errors.push("'tipo' debe ser uno de: pago, feriado, otros");
  }

  if (data.tipo === ANOTACION_TIPOS.PAGO) {
    const totalCobrado = normalizeNumber(payload.totalCobrado);
    const adelantos = normalizeNumber(payload.adelantos);
    const propinas = normalizeNumber(payload.propinas);

    if (totalCobrado < 0 || adelantos < 0 || propinas < 0) {
      errors.push("'totalCobrado', 'adelantos' y 'propinas' no pueden ser negativos");
    }

    data.totalCobrado = totalCobrado;
    data.adelantos = adelantos;
    data.propinas = propinas;
    data.totalNeto = totalCobrado - adelantos + propinas;
  } else {
    data.totalCobrado = null;
    data.adelantos = null;
    data.propinas = null;
    data.totalNeto = null;
  }

  if ((data.tipo === ANOTACION_TIPOS.FERIADO || data.tipo === ANOTACION_TIPOS.OTROS) && !descripcion) {
    errors.push("'descripcion' es obligatoria para feriado y otros");
  }

  return {
    isValid: errors.length === 0,
    errors,
    data,
  };
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
  validateAnotacionPayload,
  normalizeNumber,
  ANOTACION_TIPOS,
};

function notFound(req, res) {
  res.status(404).json({ error: "Ruta no encontrada" });
}

function errorHandler(err, req, res, next) {
  console.error("Error no controlado:", err);
  res.status(500).json({ error: "Ocurrió un error inesperado." });
}

module.exports = {
  notFound,
  errorHandler,
};

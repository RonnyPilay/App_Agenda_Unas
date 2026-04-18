const { Router } = require("express");
const controller = require("../controllers/anotacionesController");

const router = Router();

router.get("/", controller.listarAnotaciones);
router.get("/:fecha", controller.obtenerAnotacionPorFecha);
router.post("/", controller.upsertAnotacion);
router.delete("/:fecha", controller.eliminarAnotacion);

module.exports = router;

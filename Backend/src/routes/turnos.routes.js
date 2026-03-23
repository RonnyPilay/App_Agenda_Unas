const { Router } = require("express");
const controller = require("../controllers/turnosController");

const router = Router();

router.get("/", controller.listarTurnos);
router.get("/:id", controller.obtenerTurno);
router.post("/", controller.crearTurno);
router.put("/:id", controller.actualizarTurno);
router.delete("/:id", controller.eliminarTurno);

module.exports = router;

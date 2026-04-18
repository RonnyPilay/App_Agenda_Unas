const { Router } = require("express");
const turnosRoutes = require("./turnos.routes");
const gananciasRoutes = require("./ganancias.routes");
const anotacionesRoutes = require("./anotaciones.routes");

const router = Router();

router.use("/turnos", turnosRoutes);
router.use("/ganancias", gananciasRoutes);
router.use("/anotaciones", anotacionesRoutes);

module.exports = router;

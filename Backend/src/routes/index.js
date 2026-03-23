const { Router } = require("express");
const turnosRoutes = require("./turnos.routes");
const gananciasRoutes = require("./ganancias.routes");

const router = Router();

router.use("/turnos", turnosRoutes);
router.use("/ganancias", gananciasRoutes);

module.exports = router;

const { Router } = require("express");
const controller = require("../controllers/gananciasController");

const router = Router();

router.get("/", controller.calcularGanancias);

module.exports = router;

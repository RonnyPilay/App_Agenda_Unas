const app = require("./app");
const config = require("./config");

app.listen(config.port, () => {
  console.log(`API de Juli's Agenda lista en http://localhost:${config.port}`);
});

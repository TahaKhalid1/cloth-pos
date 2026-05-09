const { initializeDatabase } = require("./src/db");
const { createApp } = require("./src/app");

const PORT = Number(process.env.PORT) || 4000;

initializeDatabase();

const app = createApp();

app.listen(PORT, () => {
  console.log(`Cloth POS API running on http://localhost:${PORT}`);
});

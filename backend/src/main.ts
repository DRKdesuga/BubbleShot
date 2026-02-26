import express from "express";
import router from "./presentation/http/routes";

const app = express();

app.use(express.json());
app.use(router);

const port = Number(process.env.PORT) || 3000;

app.listen(port, "0.0.0.0", () => {
  console.log(`[http] listening on http://localhost:${port}`);
});

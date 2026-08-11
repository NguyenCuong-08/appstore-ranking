import express from "express";
import cors from "cors";
import rankingRouter from "./routes/ranking.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/api", rankingRouter);

app.get("/", (req, res) => {
  res.json({
    name: "App Store Ranking API",
    endpoints: [
      "GET /api/ranking?country=us&category=games&chart=top-free&limit=100",
      "GET /api/app-rank?appId=123456&country=us&category=games&chart=top-free",
      "GET /api/health",
    ],
  });
});

app.listen(PORT, () => {
  console.log(`[server] App Store Ranking API running at http://localhost:${PORT}`);
});

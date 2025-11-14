import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";

import authRoutes from "./routes/auth";
import espRoutes from "./routes/esp";
import contactsRoutes from "./routes/contacts";
import wppRoutes from "./routes/wpp";
import subscribesRoutes from "./routes/subscribes";
import usersRoute from "./routes/users";
import logsRoutes from "./routes/logs";

import { requireAuth } from "./middlewares/requireAuth";
import { requireAdmin } from "./middlewares/requireAdmin";
import { log } from "./utils/logger";

const app = express();

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser());

// ==== Public / Auth
app.use("/api/auth", authRoutes);

// ==== ESP
app.use("/api/esp", espRoutes);

// ==== Admin-only
app.use("/api/contacts", requireAuth, requireAdmin, contactsRoutes);
app.use("/api/wpp", requireAuth, requireAdmin, wppRoutes);
app.use("/api/users", requireAuth, requireAdmin, usersRoute);

// ==== Just login
app.use("/api/logs", requireAuth, logsRoutes);
app.use("/api/subscribes", requireAuth, subscribesRoutes);

// Logout
app.post("/api/auth/logout", (_req, res) => {
  res.clearCookie("token", { path: "/" });
  res.json({ ok: true });
});

// ==== Static client (Vite build)
const distPath = path.join(__dirname, "..", "client", "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (_req: Request, res: Response) =>
    res.sendFile(path.join(distPath, "index.html"))
  );
} else {
  app.get("/", (_req: Request, res: Response) =>
    res.send("Frontend dev di http://localhost:5173 (dist belum dibuild)")
  );
}

const port = Number(process.env.PORT);
app.listen(port, () => {
  log.info("APP", `Server ready on :${port}`);
});

// src/index.ts
import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import authRoutes from './routes/auth'; 

const app = express();
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (_req: Request, res: Response) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie('token', { path: '/' });
  res.json({ ok: true });
});

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const hdr = req.headers.authorization || '';
  const raw = hdr.startsWith('Bearer ') ? hdr.slice(7) : (req.cookies?.token as string | undefined);
  try {
    const jwt = require('jsonwebtoken');
    jwt.verify(raw || '', process.env.JWT_SECRET || 'changeme');
    next();
  } catch {
    res.status(401).json({ ok: false });
  }
};

app.get('/api/secure/ping', requireAuth, (_req: Request, res: Response) => res.json({ ok: true }));

const distPath = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req: Request, res: Response) => res.sendFile(path.join(distPath, 'index.html')));
} else {
  app.get('/', (_req: Request, res: Response) => res.send('Frontend dev di http://localhost:5173 (dist belum dibuild)'));
}

const port = Number(process.env.PORT);
app.listen(port, () => console.log(`Server ready on :${port}`));

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Production and Development API Endpoints
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      service: 'HR Diagnostics Enterprise Backend API',
      version: '3.4.0-enterprise',
      port: PORT,
      readyForDeployment: true,
    });
  });

  app.get('/api/system/info', (_req, res) => {
    res.json({
      status: 'online',
      application: 'HR Diagnostics Enterprise Laboratory Suite',
      deploymentReady: true,
      runtime: `Node.js ${process.version}`,
      platform: process.platform,
      arch: process.arch,
      features: [
        'Full-Stack Express + React Vite Architecture',
        '7-Level Organization & Multi-Branch Hierarchy',
        'ISO 15189 / HIPAA RBAC Access Control with 2FA',
        'Automated Disaster Recovery JSON Backups',
        'Batch & Expiry Cold-Chain Tracking',
        'PWA Offline Service Worker Support'
      ],
      timestamp: new Date().toISOString(),
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Enterprise Backend Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { query, getDatabaseProviderInfo } from './db/index.ts';
import { seedDatabaseIfEmpty } from './db/seed.ts';
import errorHandler from './errorHandler.ts';
import authRoutes from './routes/auth.routes.ts';
import categoriesRoutes from './routes/categories.routes.ts';
import sellersRoutes from './routes/sellers.routes.ts';
import customersRoutes from './routes/customers.routes.ts';
import adminsRoutes from './routes/admins.routes.ts';
import productsRoutes from './routes/products.routes.ts';
import cartRoutes from './routes/cart.routes.ts';
import ordersRoutes from './routes/orders.routes.ts';
import reviewsRoutes from './routes/reviews.routes.ts';
import { assertJwtSecret, authenticateApiRequest } from './middleware/auth.ts';

const app = express();
const PORT = 3000;

// Fail before serving requests or starting database work if signing is misconfigured.
assertJwtSecret();

app.use(authenticateApiRequest);
app.use(express.json());

// Seed Cloud SQL database if empty on server startup
seedDatabaseIfEmpty().catch((err) => {
  console.error('Database seeding check failed on startup:', err);
});

app.get('/api/db/status', async (_req, res) => {
  const providerInfo = getDatabaseProviderInfo();
  try {
    const result = await query(`SELECT 1 as test, current_database() as db_name, version() as pg_version`);
    res.json({
      connected: true,
      provider: providerInfo.provider,
      isSupabase: providerInfo.isSupabase,
      database: result.rows[0]?.db_name || providerInfo.database,
      host: providerInfo.host,
      status: 'Connected & Healthy',
      queryTest: result.rows[0] || null,
    });
  } catch (error: any) {
    console.error('Database Connection Error:', error);
    res.status(500).json({
      connected: false,
      provider: providerInfo.provider,
      isSupabase: providerInfo.isSupabase,
      database: providerInfo.database,
      error: error.message || 'Database connection error',
    });
  }
});

app.use(authRoutes);
app.use(categoriesRoutes);
app.use(sellersRoutes);
app.use(customersRoutes);
app.use(adminsRoutes);
app.use(productsRoutes);
app.use(cartRoutes);
app.use(ordersRoutes);
app.use(reviewsRoutes);

// Vite middleware integration
async function startServer() {
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

  app.use(errorHandler);

  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`E-Commerce Server running on http://localhost:${PORT}`);
    });
  }
}

void startServer();

export default app;

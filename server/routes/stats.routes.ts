import { Router } from 'express';
import { query } from '../db/index.ts';
import { requireRole } from '../middleware/auth.ts';

const router = Router();

router.get('/api/stats/top-customers', requireRole('admin'), async (_req, res) => {
  try {
    const result = await query(`SELECT * FROM gocart_top_customers(10)`);
    res.json(result.rows.map((row) => ({
      ...row,
      total_orders: Number(row.total_orders),
      total_lifetime_spent: Number(row.total_lifetime_spent),
    })));
  } catch (error) {
    console.error('Error fetching top customers:', error);
    res.status(500).json({ error: 'Failed to fetch top customers' });
  }
});

router.get('/api/stats/top-products', async (_req, res) => {
  try {
    const result = await query(`SELECT * FROM gocart_top_rated_products(12)`);
    res.json(result.rows.map((row) => ({
      ...row,
      price: Number(row.price),
      average_rating: Number(row.average_rating),
      total_reviews: Number(row.total_reviews),
    })));
  } catch (error) {
    console.error('Error fetching top products:', error);
    res.status(500).json({ error: 'Failed to fetch top products' });
  }
});

router.get('/api/stats/top-sellers', async (_req, res) => {
  try {
    const result = await query(`SELECT * FROM gocart_top_sellers(10)`);
    res.json(result.rows.map((row) => ({
      ...row,
      total_active_products: Number(row.total_active_products),
      total_lifetime_reviews: Number(row.total_lifetime_reviews),
      overall_average_rating: Number(row.overall_average_rating),
    })));
  } catch (error) {
    console.error('Error fetching top sellers:', error);
    res.status(500).json({ error: 'Failed to fetch top sellers' });
  }
});

router.get('/api/stats/trending-products', async (_req, res) => {
  try {
    const result = await query(`SELECT * FROM gocart_trending_products(10)`);
    res.json(result.rows.map((row) => ({
      ...row,
      price: Number(row.price),
      available_stock: Number(row.available_stock),
      distinct_customers_wanting_this: Number(row.distinct_customers_wanting_this),
      total_units_in_carts: Number(row.total_units_in_carts),
    })));
  } catch (error) {
    console.error('Error fetching trending products:', error);
    res.status(500).json({ error: 'Failed to fetch trending products' });
  }
});

router.get('/api/stats/category-performance', requireRole('admin'), async (_req, res) => {
  try {
    const result = await query(`SELECT * FROM gocart_category_performance()`);
    res.json(result.rows.map((row) => ({
      ...row,
      total_unique_products: Number(row.total_unique_products),
      total_units_in_stock: Number(row.total_units_in_stock),
      average_product_price: Number(row.average_product_price),
      total_inventory_value: Number(row.total_inventory_value),
    })));
  } catch (error) {
    console.error('Error fetching category performance:', error);
    res.status(500).json({ error: 'Failed to fetch category performance' });
  }
});

export default router;
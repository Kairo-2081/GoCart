import { Router } from 'express';
import { query, withTransaction } from '../db/index.ts';
import { requireRole, type AuthRequest } from '../middleware/auth.ts';
import type { Review } from '../../src/types.ts';

const router = Router();

router.get('/api/reviews', async (req, res) => {
  try {
    const { productId, sellerId } = req.query;
    let result;
    if (productId && typeof productId === 'string') {
      result = await query(`SELECT r.* FROM reviews r WHERE r.product_id = $1 ORDER BY r.created_at DESC`, [productId]);
    } else if (sellerId && typeof sellerId === 'string') {
      result = await query(`SELECT r.* FROM reviews r JOIN products p ON p.id = r.product_id WHERE p.seller_id = $1 ORDER BY r.created_at DESC`, [sellerId]);
    } else {
      result = await query(`SELECT * FROM reviews ORDER BY created_at DESC`);
    }
    const formatted: Review[] = result.rows.map((r: any) => ({
      Review_ID: r.id, Product_ID: r.product_id, Customer_ID: r.customer_id,
      Customer_Name: r.customer_name, Review_text: r.review_text, Rating: Number(r.rating),
      Created_At: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    }));
    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

router.post('/api/reviews', requireRole('customer'), async (req: AuthRequest, res) => {
  try {
    const { Product_ID, Review_text, Rating } = req.body;
    const ratingNum = Number(Rating);
    if (!Product_ID || !Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) return res.status(400).json({ error: 'Product_ID and a rating from 1 to 5 are required' });
    const product = await query(`SELECT id FROM products WHERE id = $1`, [Product_ID]);
    if (!product.rows.length) return res.status(404).json({ error: 'Product not found' });
    const customer = await query(`SELECT name FROM customers WHERE id = $1`, [req.user!.sub]);
    if (!customer.rows.length) return res.status(401).json({ error: 'Customer account not found' });
    const id = `REV-${Date.now()}`;
    const customerName = (customer.rows[0] as any).name || req.user!.name;
    const reviewText = typeof Review_text === 'string' ? Review_text : '';
    await withTransaction((client) => client.query(
      `INSERT INTO reviews (id, product_id, customer_id, customer_name, review_text, rating, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [id, Product_ID, req.user!.sub, customerName, reviewText, ratingNum]
    ));
    res.status(201).json({
      Review_ID: id, Product_ID, Customer_ID: req.user!.sub, Customer_Name: customerName,
      Review_text: reviewText, Rating: ratingNum, Created_At: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create review' });
  }
});

export default router;

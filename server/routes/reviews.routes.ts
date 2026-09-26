import { Router } from 'express';
import { query, withTransaction } from '../db/index.ts';
import { requireRole, type AuthRequest } from '../middleware/auth.ts';
import { isIdentifier, isText, respondApiError } from '../utils.ts';
import type { Review } from '../../src/types.ts';

const router = Router();

router.get('/api/reviews', async (req, res) => {
  try {
    const { productId, sellerId } = req.query;
    if ((productId !== undefined && !isIdentifier(productId)) || (sellerId !== undefined && !isIdentifier(sellerId))) {
      return res.status(400).json({ error: 'Invalid productId or sellerId filter.' });
    }
    let result;
    if (productId && typeof productId === 'string') {
      result = await query(`SELECT * FROM gocart_reviews_by_product($1)`, [productId]);
    } else if (sellerId && typeof sellerId === 'string') {
      result = await query(`SELECT * FROM gocart_reviews_by_seller($1)`, [sellerId]);
    } else {
      result = await query(`SELECT * FROM gocart_reviews_list()`);
    }
    const formatted: Review[] = result.rows.map((r: any) => ({
      Review_ID: r.id, Product_ID: r.product_id, Customer_ID: r.customer_id,
      Customer_Name: r.customer_name, Review_text: r.review_text, Rating: Number(r.rating),
      Created_At: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    }));
    res.json(formatted);
  } catch (error: any) {
    respondApiError(res, error, 'Error fetching reviews:');
  }
});

router.post('/api/reviews', requireRole('customer'), async (req: AuthRequest, res) => {
  try {
    const { Product_ID, Review_text, Rating } = req.body;
    const ratingNum = Rating;
    if (!isIdentifier(Product_ID) || typeof ratingNum !== 'number' || !Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5 || !isText(Review_text ?? '', 5000, true)) {
      return res.status(400).json({ error: 'A valid Product_ID, review text up to 5000 characters, and integer rating from 1 to 5 are required.' });
    }
    const product = await query(`SELECT * FROM gocart_product_get($1)`, [Product_ID]);
    if (!product.rows.length) return res.status(404).json({ error: 'Product not found' });
    const customer = await query(`SELECT * FROM gocart_customer_get($1)`, [req.user!.sub]);
    if (!customer.rows.length) return res.status(401).json({ error: 'Customer account not found' });
    const id = `REV-${Date.now()}`;
    const customerName = (customer.rows[0] as any).name || req.user!.name;
    const reviewText = (Review_text ?? '').trim();
    await withTransaction((client) => client.query(
      `SELECT * FROM gocart_review_create($1, $2, $3, $4, $5, $6)`,
      [id, Product_ID, req.user!.sub, customerName, reviewText, ratingNum]
    ));
    res.status(201).json({
      Review_ID: id, Product_ID, Customer_ID: req.user!.sub, Customer_Name: customerName,
      Review_text: reviewText, Rating: ratingNum, Created_At: new Date().toISOString(),
    });
  } catch (error: any) {
    respondApiError(res, error, 'Error creating review:');
  }
});

export default router;

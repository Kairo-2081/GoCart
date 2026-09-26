import { Router } from 'express';
import { query, withTransaction } from '../db/index.ts';
import { requireRole, type AuthRequest } from '../middleware/auth.ts';
import { isIdentifier, respondApiError } from '../utils.ts';

const router = Router();

router.get('/api/cart', requireRole('customer'), async (req: AuthRequest, res) => {
  try {
    const customerId = req.user!.sub;
    const itemsRes = await query(`SELECT * FROM gocart_cart_list($1)`, [customerId]);
    const productsRes = await query(`SELECT * FROM gocart_products_list()`);
    const allProducts: any[] = productsRes.rows;
    const enriched = itemsRes.rows.map((item: any) => {
      const p = allProducts.find((prod) => prod.id === item.product_id);
      return {
        Cart_ID: item.id, Customer_ID: item.customer_id, Product_ID: item.product_id, Quantity: item.quantity,
        Product: p ? {
          Product_ID: p.id, Name: p.name, Image: p.image || '', Description: p.description || '',
          Price: Number(p.price), Voucher: p.voucher || '', Stock: Number(p.stock),
          Product_Status: p.product_status as any, Category_ID: p.category_id, Seller_ID: p.seller_id,
        } : undefined,
      };
    });
    res.json(enriched);
  } catch (error: any) {
    respondApiError(res, error, 'Error fetching cart:');
  }
});

router.post('/api/cart', requireRole('customer'), async (req: AuthRequest, res) => {
  try {
    const customerId = req.user!.sub;
    const { Product_ID, Quantity = 1 } = req.body;
    const qty = Quantity;
    if (!isIdentifier(Product_ID) || !Number.isInteger(qty) || qty < 1) return res.status(400).json({ error: 'A valid Product_ID and positive integer Quantity are required.' });
    const product = await query(`SELECT * FROM gocart_active_product($1)`, [Product_ID]);
    if (!product.rows.length) return res.status(404).json({ error: 'Product not found or unavailable' });
    const existing = await query(`SELECT * FROM gocart_cart_existing($1, $2)`, [customerId, Product_ID]);
    if (existing.rows.length > 0) {
      const currentItem: any = existing.rows[0];
      const newQty = Number(currentItem.quantity) + qty;
      await withTransaction((client) => client.query(`SELECT * FROM gocart_cart_update($1, $2, $3)`, [currentItem.id, newQty, customerId]));
      return res.json({ Cart_ID: currentItem.id, Customer_ID: customerId, Product_ID, Quantity: newQty });
    }
    const cartId = `CART-${Date.now()}`;
    await withTransaction((client) => client.query(`SELECT * FROM gocart_cart_create($1, $2, $3, $4)`, [cartId, customerId, Product_ID, qty]));
    res.status(201).json({ Cart_ID: cartId, Customer_ID: customerId, Product_ID, Quantity: qty });
  } catch (error: any) {
    respondApiError(res, error, 'Error adding to cart:');
  }
});

router.patch('/api/cart/:cartId', requireRole('customer'), async (req: AuthRequest, res) => {
  try {
    const { cartId } = req.params;
    const qty = req.body.Quantity;
    if (!isIdentifier(cartId)) return res.status(400).json({ error: 'Invalid cart item ID.' });
    if (!Number.isInteger(qty) || qty < 1) return res.status(400).json({ error: 'Quantity must be a positive integer' });
    const result = await withTransaction((client) => client.query(`SELECT * FROM gocart_cart_update($1, $2, $3)`, [cartId, qty, req.user!.sub]));
    if (!result.rows.length) return res.status(404).json({ error: 'Cart item not found' });
    res.json({ Cart_ID: cartId, Quantity: qty });
  } catch (error: any) {
    respondApiError(res, error, 'Error updating cart item:');
  }
});

router.delete('/api/cart/:cartId', requireRole('customer'), async (req: AuthRequest, res) => {
  try {
    const { cartId } = req.params;
    if (!isIdentifier(cartId)) return res.status(400).json({ error: 'Invalid cart item ID.' });
    const result = await withTransaction((client) => client.query(`SELECT * FROM gocart_cart_delete($1, $2)`, [cartId, req.user!.sub]));
    if (!result.rows.length) return res.status(404).json({ error: 'Cart item not found' });
    res.sendStatus(204);
  } catch (error: any) {
    respondApiError(res, error, 'Error removing cart item:');
  }
});

export default router;

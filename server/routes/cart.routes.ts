import { Router } from 'express';
import { query, withTransaction } from '../db/index.ts';
import { requireRole, type AuthRequest } from '../middleware/auth.ts';

const router = Router();

router.get('/api/cart', requireRole('customer'), async (req: AuthRequest, res) => {
  try {
    const customerId = req.user!.sub;
    const itemsRes = await query(`SELECT * FROM cart WHERE customer_id = $1`, [customerId]);
    const productsRes = await query(`SELECT * FROM products`);
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
    console.error('Error fetching cart:', error);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

router.post('/api/cart', requireRole('customer'), async (req: AuthRequest, res) => {
  try {
    const customerId = req.user!.sub;
    const { Product_ID, Quantity = 1 } = req.body;
    const qty = Number(Quantity);
    if (!Product_ID || !Number.isInteger(qty) || qty < 1) return res.status(400).json({ error: 'Product_ID and a positive integer Quantity are required' });
    const product = await query(`SELECT id FROM products WHERE id = $1 AND product_status = 'active'`, [Product_ID]);
    if (!product.rows.length) return res.status(404).json({ error: 'Product not found or unavailable' });
    const existing = await query(`SELECT * FROM cart WHERE customer_id = $1 AND product_id = $2 LIMIT 1`, [customerId, Product_ID]);
    if (existing.rows.length > 0) {
      const currentItem: any = existing.rows[0];
      const newQty = Number(currentItem.quantity) + qty;
      await withTransaction((client) => client.query(`UPDATE cart SET quantity = $1 WHERE id = $2 AND customer_id = $3`, [newQty, currentItem.id, customerId]));
      return res.json({ Cart_ID: currentItem.id, Customer_ID: customerId, Product_ID, Quantity: newQty });
    }
    const cartId = `CART-${Date.now()}`;
    await withTransaction((client) => client.query(`INSERT INTO cart (id, customer_id, product_id, quantity) VALUES ($1, $2, $3, $4)`, [cartId, customerId, Product_ID, qty]));
    res.status(201).json({ Cart_ID: cartId, Customer_ID: customerId, Product_ID, Quantity: qty });
  } catch (error: any) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ error: 'Failed to update cart' });
  }
});

router.put('/api/cart/:cartId', requireRole('customer'), async (req: AuthRequest, res) => {
  try {
    const { cartId } = req.params;
    const qty = Number(req.body.Quantity);
    if (!Number.isInteger(qty) || qty < 1) return res.status(400).json({ error: 'Quantity must be a positive integer' });
    const result = await withTransaction((client) => client.query(`UPDATE cart SET quantity = $1 WHERE id = $2 AND customer_id = $3 RETURNING id`, [qty, cartId, req.user!.sub]));
    if (!result.rows.length) return res.status(404).json({ error: 'Cart item not found' });
    res.json({ Cart_ID: cartId, Quantity: qty });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update cart item' });
  }
});

router.delete('/api/cart/:cartId', requireRole('customer'), async (req: AuthRequest, res) => {
  try {
    const { cartId } = req.params;
    const result = await withTransaction((client) => client.query(`DELETE FROM cart WHERE id = $1 AND customer_id = $2 RETURNING id`, [cartId, req.user!.sub]));
    if (!result.rows.length) return res.status(404).json({ error: 'Cart item not found' });
    res.json({ success: true, message: 'Cart item removed' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to remove cart item' });
  }
});

export default router;

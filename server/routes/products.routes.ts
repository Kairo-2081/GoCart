import { Router } from 'express';
import { query, withTransaction } from '../db/index.ts';
import { optionalAuth, requireRole, type AuthRequest } from '../middleware/auth.ts';
import type { Product } from '../../src/types.ts';

const router = Router();

router.get('/api/products', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { sellerId, categoryId, search, status } = req.query;
    const result = await query(`SELECT * FROM products ORDER BY id DESC`);
    const effectiveSellerId = req.user?.role === 'seller' ? req.user.sub : sellerId;
    const canSeeAllStatuses = req.user?.role === 'admin' || req.user?.role === 'seller';
    let formatted: Product[] = result.rows.map((p: any) => ({
      Product_ID: p.id, Name: p.name, Image: p.image || '', Description: p.description || '',
      Price: Number(p.price), Voucher: p.voucher || '', Stock: Number(p.stock),
      Product_Status: p.product_status as any, Category_ID: p.category_id, Seller_ID: p.seller_id,
      Review_ID: p.review_id || undefined,
    }));
    if (!canSeeAllStatuses) formatted = formatted.filter((p) => p.Product_Status === 'active');
    else if (status) formatted = formatted.filter((p) => p.Product_Status === status);
    if (effectiveSellerId) formatted = formatted.filter((p) => p.Seller_ID === effectiveSellerId);
    if (categoryId && categoryId !== 'all') formatted = formatted.filter((p) => p.Category_ID === categoryId);
    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      formatted = formatted.filter((p) => p.Name.toLowerCase().includes(q) || p.Description.toLowerCase().includes(q));
    }
    res.json(formatted);
  } catch (error: any) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.post('/api/products', requireRole('seller', 'admin'), async (req: AuthRequest, res) => {
  try {
    const { Name, Image, Description, Price, Voucher, Stock, Category_ID, Product_Status } = req.body;
    const sellerId = req.user!.role === 'seller' ? req.user!.sub : req.body.Seller_ID;
    if (!Name || Price === undefined || !Category_ID || !sellerId) return res.status(400).json({ error: 'Name, Price, Category, and Seller are required' });
    const sellerCheck = await query(`SELECT * FROM sellers WHERE id = $1`, [sellerId]);
    if (!sellerCheck.rows.length || (req.user!.role === 'seller' && (sellerCheck.rows[0] as any).status !== 'approved')) {
      return res.status(403).json({ error: 'Only approved sellers can publish products' });
    }
    const id = `PROD-${Date.now()}`;
    const img = Image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80';
    const desc = Description || '';
    const priceNum = Number(Price);
    const vouch = Voucher || '';
    const stockNum = Number(Stock) || 0;
    const prodStat = Product_Status || 'active';
    if (!Number.isFinite(priceNum) || priceNum < 0 || !Number.isInteger(stockNum) || stockNum < 0) return res.status(400).json({ error: 'Price and stock must be valid non-negative values' });
    if (!['active', 'inactive', 'deactivated'].includes(prodStat)) return res.status(400).json({ error: 'Invalid product status' });
    await withTransaction((client) => client.query(
      `INSERT INTO products (id, name, image, description, price, voucher, stock, product_status, category_id, seller_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)`,
      [id, Name, img, desc, priceNum, vouch, stockNum, prodStat, Category_ID, sellerId]
    ));
    const newProd: Product = { Product_ID: id, Name, Image: img, Description: desc, Price: priceNum, Voucher: vouch, Stock: stockNum, Product_Status: prodStat as any, Category_ID, Seller_ID: sellerId };
    res.status(201).json(newProd);
  } catch (error: any) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

router.put('/api/products/:id', requireRole('seller', 'admin'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const existing = await query(`SELECT * FROM products WHERE id = $1`, [id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Product not found' });
    const current: any = existing.rows[0];
    if (req.user!.role === 'seller' && current.seller_id !== req.user!.sub) return res.status(403).json({ error: 'You may only edit your own products' });
    const name = req.body.Name ?? current.name;
    const image = req.body.Image ?? current.image;
    const description = req.body.Description ?? current.description;
    const price = req.body.Price !== undefined ? Number(req.body.Price) : Number(current.price);
    const voucher = req.body.Voucher ?? current.voucher;
    const stock = req.body.Stock !== undefined ? Number(req.body.Stock) : Number(current.stock);
    const productStatus = req.body.Product_Status ?? current.product_status;
    const categoryId = req.body.Category_ID ?? current.category_id;
    if (!Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0 || !['active', 'inactive', 'deactivated'].includes(productStatus)) return res.status(400).json({ error: 'Invalid product values' });
    await withTransaction((client) => client.query(
      `UPDATE products SET name = $1, image = $2, description = $3, price = $4, voucher = $5,
       stock = $6, product_status = $7, category_id = $8 WHERE id = $9`,
      [name, image, description, price, voucher, stock, productStatus, categoryId, id]
    ));
    res.json({ Product_ID: id, Name: name, Image: image, Description: description, Price: price, Voucher: voucher, Stock: stock, Product_Status: productStatus, Category_ID: categoryId, Seller_ID: current.seller_id, Review_ID: current.review_id || undefined });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

router.put('/api/products/:id/status', requireRole('seller', 'admin'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { Product_Status } = req.body;
    if (!['active', 'inactive', 'deactivated'].includes(Product_Status)) return res.status(400).json({ error: 'Invalid product status' });
    const result = await query(`SELECT seller_id FROM products WHERE id = $1`, [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Product not found' });
    if (req.user!.role === 'seller' && (result.rows[0] as any).seller_id !== req.user!.sub) return res.status(403).json({ error: 'You may only update your own products' });
    await withTransaction((client) => client.query(`UPDATE products SET product_status = $1 WHERE id = $2`, [Product_Status, id]));
    res.json({ success: true, id, Product_Status });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

router.delete('/api/products/:id', requireRole('seller', 'admin'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const existing = await query(`SELECT seller_id FROM products WHERE id = $1`, [id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Product not found' });
    if (req.user!.role === 'seller' && (existing.rows[0] as any).seller_id !== req.user!.sub) return res.status(403).json({ error: 'You may only delete your own products' });
    await withTransaction((client) => client.query(`DELETE FROM products WHERE id = $1`, [id]));
    res.json({ success: true, message: 'Product deleted' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;

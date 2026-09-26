import { Router } from 'express';
import { query, withTransaction } from '../db/index.ts';
import { optionalAuth, requireRole, type AuthRequest } from '../middleware/auth.ts';
import { isIdentifier, isText, respondApiError } from '../utils.ts';
import type { Product } from '../../src/types.ts';

const router = Router();

router.get('/api/products', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { sellerId, categoryId, search, status } = req.query;
    if ((sellerId !== undefined && !isIdentifier(sellerId)) ||
      (categoryId !== undefined && categoryId !== 'all' && !isIdentifier(categoryId)) ||
      (search !== undefined && !isText(search, 100, true)) ||
      (status !== undefined && !['active', 'inactive', 'deactivated'].includes(status as string))) {
      return res.status(400).json({ error: 'Invalid product filter.' });
    }
    const result = await query(`SELECT * FROM gocart_products_list()`);
    const effectiveSellerId = req.user?.role === 'seller' ? req.user.sub : sellerId;
    const canSeeAllStatuses = req.user?.role === 'admin' || req.user?.role === 'seller';
    let formatted: Product[] = result.rows.map((p: any) => ({
      Product_ID: p.id, Name: p.name, Image: p.image || '', Description: p.description || '',
      Price: Number(p.price), Voucher: p.voucher || '', Stock: Number(p.stock),
      Product_Status: p.product_status as any, Category_ID: p.category_id, Seller_ID: p.seller_id,
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
    respondApiError(res, error, 'Error fetching products:');
  }
});

router.post('/api/products', requireRole('seller', 'admin'), async (req: AuthRequest, res) => {
  try {
    const { Name, Image, Description, Price, Voucher, Stock, Category_ID, Product_Status } = req.body;
    const sellerId = req.user!.role === 'seller' ? req.user!.sub : req.body.Seller_ID;
    if (!isText(Name, 255) || !isIdentifier(Category_ID) || !isIdentifier(sellerId) ||
      (Image !== undefined && !isText(Image, 2048, true)) ||
      (Description !== undefined && !isText(Description, 10000, true)) ||
      (Voucher !== undefined && !isText(Voucher, 50, true))) {
      return res.status(400).json({ error: 'Invalid product fields.' });
    }
    const priceNum = Price;
    const stockNum = Stock === undefined ? 0 : Stock;
    const prodStat = Product_Status || 'active';
    if (typeof priceNum !== 'number' || !Number.isFinite(priceNum) || priceNum < 0 ||
      typeof stockNum !== 'number' || !Number.isInteger(stockNum) || stockNum < 0) {
      return res.status(400).json({ error: 'Price and stock must be valid non-negative numbers.' });
    }
    if (!['active', 'inactive', 'deactivated'].includes(prodStat)) return res.status(400).json({ error: 'Invalid product status' });
    const sellerCheck = await query(`SELECT * FROM gocart_seller_get($1)`, [sellerId]);
    if (!sellerCheck.rows.length) return res.status(404).json({ error: 'Seller not found.' });
    if ((sellerCheck.rows[0] as any).status !== 'approved') {
      return res.status(403).json({ error: 'Only approved sellers can publish products' });
    }
    const id = `PROD-${Date.now()}`;
    const img = Image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80';
    const desc = Description || '';
    const vouch = Voucher || '';
    await withTransaction((client) => client.query(
      `SELECT * FROM gocart_product_create($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, Name, img, desc, priceNum, vouch, stockNum, prodStat, Category_ID, sellerId]
    ));
    const newProd: Product = { Product_ID: id, Name, Image: img, Description: desc, Price: priceNum, Voucher: vouch, Stock: stockNum, Product_Status: prodStat as any, Category_ID, Seller_ID: sellerId };
    res.status(201).json(newProd);
  } catch (error: any) {
    respondApiError(res, error, 'Error creating product:');
  }
});

router.patch('/api/products/:id', requireRole('seller', 'admin'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    if (!isIdentifier(id)) return res.status(400).json({ error: 'Invalid product ID.' });
    const { Name, Image, Description, Price, Voucher, Stock, Product_Status, Category_ID } = req.body;
    if ((Name !== undefined && !isText(Name, 255)) ||
      (Image !== undefined && !isText(Image, 2048, true)) ||
      (Description !== undefined && !isText(Description, 10000, true)) ||
      (Price !== undefined && (typeof Price !== 'number' || !Number.isFinite(Price) || Price < 0)) ||
      (Voucher !== undefined && !isText(Voucher, 50, true)) ||
      (Stock !== undefined && (typeof Stock !== 'number' || !Number.isInteger(Stock) || Stock < 0)) ||
      (Product_Status !== undefined && !['active', 'inactive', 'deactivated'].includes(Product_Status)) ||
      (Category_ID !== undefined && !isIdentifier(Category_ID))) {
      return res.status(400).json({ error: 'Invalid product fields.' });
    }
    const existing = await query(`SELECT * FROM gocart_product_get($1)`, [id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Product not found' });
    const current: any = existing.rows[0];
    if (req.user!.role === 'seller' && current.seller_id !== req.user!.sub) return res.status(403).json({ error: 'You may only edit your own products' });
    const name = Name ?? current.name;
    const image = Image ?? current.image;
    const description = Description ?? current.description;
    const price = Price ?? Number(current.price);
    const voucher = Voucher ?? current.voucher;
    const stock = Stock ?? Number(current.stock);
    const productStatus = Product_Status ?? current.product_status;
    const categoryId = Category_ID ?? current.category_id;
    if (!Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0 || !['active', 'inactive', 'deactivated'].includes(productStatus)) return res.status(400).json({ error: 'Invalid product values' });
    await withTransaction((client) => client.query(
      `SELECT * FROM gocart_product_update($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, name, image, description, price, voucher, stock, productStatus, categoryId]
    ));
    res.json({ Product_ID: id, Name: name, Image: image, Description: description, Price: price, Voucher: voucher, Stock: stock, Product_Status: productStatus, Category_ID: categoryId, Seller_ID: current.seller_id });
  } catch (error: any) {
    respondApiError(res, error, 'Error updating product:');
  }
});

router.put('/api/products/:id/status', requireRole('seller', 'admin'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { Product_Status } = req.body;
    if (!isIdentifier(id)) return res.status(400).json({ error: 'Invalid product ID.' });
    if (!['active', 'inactive', 'deactivated'].includes(Product_Status)) return res.status(400).json({ error: 'Invalid product status' });
    const result = await query(`SELECT seller_id FROM gocart_product_get($1)`, [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Product not found' });
    if (req.user!.role === 'seller' && (result.rows[0] as any).seller_id !== req.user!.sub) return res.status(403).json({ error: 'You may only update your own products' });
    await withTransaction((client) => client.query(`SELECT * FROM gocart_product_status_update($1, $2)`, [id, Product_Status]));
    res.json({ success: true, id, Product_Status });
  } catch (error: any) {
    respondApiError(res, error, 'Error updating product status:');
  }
});

router.delete('/api/products/:id', requireRole('seller', 'admin'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    if (!isIdentifier(id)) return res.status(400).json({ error: 'Invalid product ID.' });
    const existing = await query(`SELECT seller_id FROM gocart_product_get($1)`, [id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Product not found' });
    if (req.user!.role === 'seller' && (existing.rows[0] as any).seller_id !== req.user!.sub) return res.status(403).json({ error: 'You may only delete your own products' });
    const result = await withTransaction((client) => client.query(`SELECT * FROM gocart_product_delete($1)`, [id]));
    if (!result.rows.length) return res.status(404).json({ error: 'Product not found.' });
    res.sendStatus(204);
  } catch (error: any) {
    respondApiError(res, error, 'Error deleting product:');
  }
});

export default router;

import { Router } from 'express';
import { query } from '../db/index.ts';
import { requireRole, type AuthRequest } from '../middleware/auth.ts';
import type { Order } from '../../src/types.ts';

const router = Router();

function toOrder(o: any): Order {
  return {
    Order_ID: o.id, Tracking_ID: o.tracking_id || '', Customer_ID: o.customer_id,
    Items: typeof o.items_json === 'string' ? JSON.parse(o.items_json) : o.items_json,
    Subtotal: Number(o.subtotal), Shipping_Fee: Number(o.shipping_fee), Status: o.status as any,
    Shipping_Address: o.shipping_address_json ? (typeof o.shipping_address_json === 'string' ? JSON.parse(o.shipping_address_json) : o.shipping_address_json) : { Street: '', House_Name: '', City: '', Postal_Code: '' },
    Billing_Address: o.billing_address_json ? (typeof o.billing_address_json === 'string' ? JSON.parse(o.billing_address_json) : o.billing_address_json) : { Street: '', House_Name: '', City: '', Postal_Code: '' },
    Order_Placed_At: o.order_placed_at ? new Date(o.order_placed_at).toISOString() : new Date().toISOString(),
    Additional_Info: o.additional_info || '',
  };
}

router.get('/api/orders', requireRole('customer', 'seller', 'admin'), async (req: AuthRequest, res) => {
  try {
    const result = await query(`SELECT * FROM orders ORDER BY order_placed_at DESC`);
    let formatted = result.rows.map(toOrder);
    if (req.user!.role === 'customer') formatted = formatted.filter((order) => order.Customer_ID === req.user!.sub);
    else if (req.user!.role === 'seller') formatted = formatted.filter((order) => order.Items.some((item: any) => item.Seller_ID === req.user!.sub));
    else {
      const { customerId, sellerId } = req.query;
      if (customerId) formatted = formatted.filter((order) => order.Customer_ID === customerId);
      if (sellerId) formatted = formatted.filter((order) => order.Items.some((item: any) => item.Seller_ID === sellerId));
    }
    res.json(formatted);
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

router.post('/api/orders', requireRole('customer'), async (req: AuthRequest, res) => {
  try {
    const { Items, Shipping_Address, Billing_Address, Shipping_Fee, Additional_Info } = req.body;
    if (!Array.isArray(Items) || !Items.length || !Shipping_Address || typeof Shipping_Address !== 'object') {
      return res.status(400).json({ error: 'Items and Shipping Address are required' });
    }
    const normalizedItems = [];
    for (const requested of Items) {
      const productId = requested?.Product_ID;
      const quantity = Number(requested?.Quantity);
      if (!productId || !Number.isInteger(quantity) || quantity < 1) return res.status(400).json({ error: 'Each order item requires a product and positive integer quantity' });
      const result = await query(`SELECT * FROM products WHERE id = $1 AND product_status = 'active'`, [productId]);
      if (!result.rows.length) return res.status(400).json({ error: `Product ${productId} is unavailable` });
      const product: any = result.rows[0];
      if (quantity > Number(product.stock)) return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
      normalizedItems.push({
        Product_ID: product.id, Name: product.name, Price: Number(product.price), Quantity: quantity,
        Image: product.image || '', Seller_ID: product.seller_id,
      });
    }
    const subtotal = normalizedItems.reduce((total, item) => total + item.Price * item.Quantity, 0);
    const shippingFee = Number(Shipping_Fee ?? 5);
    if (!Number.isFinite(shippingFee) || shippingFee < 0) return res.status(400).json({ error: 'Invalid shipping fee' });
    const trackNum1 = Math.floor(1000 + Math.random() * 9000);
    const trackNum2 = Math.floor(1000 + Math.random() * 9000);
    const Tracking_ID = `TRK-${trackNum1}-${trackNum2}`;
    const id = `ORD-${Date.now()}`;
    const shipAddrJson = JSON.stringify(Shipping_Address);
    const billAddrJson = JSON.stringify(Billing_Address || Shipping_Address);
    const addInfo = Additional_Info || '';
    await query(
      `INSERT INTO orders (id, tracking_id, customer_id, items_json, subtotal, shipping_fee, status, shipping_address_json, billing_address_json, additional_info, order_placed_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'placed', $7, $8, $9, CURRENT_TIMESTAMP)`,
      [id, Tracking_ID, req.user!.sub, JSON.stringify(normalizedItems), subtotal, shippingFee, shipAddrJson, billAddrJson, addInfo]
    );
    await query(`DELETE FROM cart WHERE customer_id = $1`, [req.user!.sub]);
    const newOrder: Order = {
      Order_ID: id, Tracking_ID, Customer_ID: req.user!.sub, Items: normalizedItems, Subtotal: subtotal, Shipping_Fee: shippingFee,
      Status: 'placed', Shipping_Address, Billing_Address: Billing_Address || Shipping_Address,
      Order_Placed_At: new Date().toISOString(), Additional_Info: addInfo,
    };
    res.status(201).json(newOrder);
  } catch (error: any) {
    console.error('Error placing order:', error);
    res.status(500).json({ error: 'Failed to place order' });
  }
});

router.put('/api/orders/:id/status', requireRole('seller', 'admin'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { Status } = req.body;
    if (!['placed', 'processing', 'shipped', 'delivered', 'cancelled'].includes(Status)) return res.status(400).json({ error: 'Invalid order status' });
    const result = await query(`SELECT * FROM orders WHERE id = $1`, [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Order not found' });
    if (req.user!.role === 'seller') {
      const order = toOrder(result.rows[0]);
      if (!order.Items.some((item: any) => item.Seller_ID === req.user!.sub)) return res.status(403).json({ error: 'You may only update orders containing your products' });
    }
    await query(`UPDATE orders SET status = $1 WHERE id = $2`, [Status, id]);
    res.json({ Order_ID: id, Status });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

export default router;

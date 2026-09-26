import { Router } from 'express';
import { query, withTransaction } from '../db/index.ts';
import { requireRole, type AuthRequest } from '../middleware/auth.ts';
import { isAddress, isIdentifier, isText, respondApiError } from '../utils.ts';
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
    let customerFilter: string | undefined;
    let sellerFilter: string | undefined;
    if (req.user!.role === 'admin') {
      const { customerId, sellerId } = req.query;
      if ((customerId !== undefined && !isIdentifier(customerId)) || (sellerId !== undefined && !isIdentifier(sellerId))) {
        return res.status(400).json({ error: 'Invalid customerId or sellerId filter.' });
      }
      customerFilter = customerId as string | undefined;
      sellerFilter = sellerId as string | undefined;
    }
    const result = await query(`SELECT * FROM gocart_orders_list()`);
    let formatted = result.rows.map(toOrder);
    if (req.user!.role === 'customer') formatted = formatted.filter((order) => order.Customer_ID === req.user!.sub);
    else if (req.user!.role === 'seller') formatted = formatted.filter((order) => order.Items.some((item: any) => item.Seller_ID === req.user!.sub));
    else {
      if (customerFilter) formatted = formatted.filter((order) => order.Customer_ID === customerFilter);
      if (sellerFilter) formatted = formatted.filter((order) => order.Items.some((item: any) => item.Seller_ID === sellerFilter));
    }
    res.json(formatted);
  } catch (error: any) {
    respondApiError(res, error, 'Error fetching orders:');
  }
});

router.post('/api/orders', requireRole('customer'), async (req: AuthRequest, res) => {
  try {
    const { Shipping_Address, Billing_Address, Shipping_Fee, Additional_Info } = req.body;
    if (!isAddress(Shipping_Address)) {
      return res.status(400).json({ error: 'Shipping Address is required' });
    }
    if (Billing_Address !== undefined && !isAddress(Billing_Address)) return res.status(400).json({ error: 'Invalid Billing Address.' });
    if (Additional_Info !== undefined && !isText(Additional_Info, 2000, true)) return res.status(400).json({ error: 'Additional_Info must be a string up to 2000 characters.' });
    const shippingFee = Shipping_Fee === undefined ? 5 : Shipping_Fee;
    if (typeof shippingFee !== 'number' || !Number.isFinite(shippingFee) || shippingFee < 0) return res.status(400).json({ error: 'Invalid shipping fee' });
    const trackNum1 = Math.floor(1000 + Math.random() * 9000);
    const trackNum2 = Math.floor(1000 + Math.random() * 9000);
    const Tracking_ID = `TRK-${trackNum1}-${trackNum2}`;
    const id = `ORD-${Date.now()}`;
    const shipAddrJson = JSON.stringify(Shipping_Address);
    const billAddrJson = JSON.stringify(Billing_Address || Shipping_Address);
    const addInfo = Additional_Info || '';
    const newOrder = await withTransaction(async (client) => {
      await client.query(
        `CALL process_checkout($1, $2, $3, $4, $5, $6, $7)`,
        [id, Tracking_ID, req.user!.sub, shippingFee, shipAddrJson, billAddrJson, addInfo]
      );
      const result = await client.query(`SELECT * FROM gocart_order_get($1)`, [id]);
      if (!result.rows.length) throw new Error('Checkout procedure did not create an order.');
      return toOrder(result.rows[0]);
    });
    res.status(201).json(newOrder);
  } catch (error: any) {
    console.error('Error placing order:', error);
    respondApiError(res, error, 'Error placing order:');
  }
});

router.put('/api/orders/:id/status', requireRole('seller', 'admin'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { Status } = req.body;
    if (!isIdentifier(id)) return res.status(400).json({ error: 'Invalid order ID.' });
    if (!['placed', 'processing', 'shipped', 'delivered', 'cancelled'].includes(Status)) return res.status(400).json({ error: 'Invalid order status' });
    const result = await query(`SELECT * FROM gocart_order_get($1)`, [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Order not found' });
    if (req.user!.role === 'seller') {
      const order = toOrder(result.rows[0]);
      if (!order.Items.some((item: any) => item.Seller_ID === req.user!.sub)) return res.status(403).json({ error: 'You may only update orders containing your products' });
    }
    await withTransaction((client) => client.query(`SELECT * FROM gocart_order_status_update($1, $2)`, [id, Status]));
    res.json({ Order_ID: id, Status });
  } catch (error: any) {
    respondApiError(res, error, 'Error updating order status:');
  }
});

export default router;

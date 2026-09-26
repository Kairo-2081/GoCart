import { Router } from 'express';
import { query, withTransaction } from '../db/index.ts';
import { requireRole } from '../middleware/auth.ts';
import { isIdentifier, isText, respondApiError } from '../utils.ts';
import type { Category } from '../../src/types.ts';

const router = Router();

router.get('/api/categories', async (_req, res) => {
  try {
    const result = await query(`SELECT * FROM gocart_categories_list()`);
    const formatted: Category[] = result.rows.map((c: any) => ({ Category_ID: c.id, Name: c.name }));
    res.json(formatted);
  } catch (error: any) {
    respondApiError(res, error, 'Error fetching categories:');
  }
});

router.post('/api/categories', requireRole('admin'), async (req, res) => {
  try {
    const { Name } = req.body;
    if (!isText(Name, 255)) return res.status(400).json({ error: 'Category Name must be a non-empty string of at most 255 characters.' });
    const id = `CAT-${Date.now()}`;
    await withTransaction((client) => client.query(`SELECT * FROM gocart_category_create($1, $2)`, [id, Name.trim()]));
    res.status(201).json({ Category_ID: id, Name: Name.trim() });
  } catch (error: any) {
    respondApiError(res, error, 'Error creating category:');
  }
});

router.patch('/api/categories/:id', requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { Name } = req.body;
    if (!isIdentifier(id)) return res.status(400).json({ error: 'Invalid category ID.' });
    if (!isText(Name, 255)) return res.status(400).json({ error: 'Category Name must be a non-empty string of at most 255 characters.' });
    const result = await withTransaction((client) => client.query(`SELECT * FROM gocart_category_update($1, $2)`, [id, Name.trim()]));
    if (!result.rowCount) return res.status(404).json({ error: 'Category not found' });
    res.json({ Category_ID: id, Name: Name.trim() });
  } catch (error: any) {
    respondApiError(res, error, 'Error updating category:');
  }
});

router.delete('/api/categories/:id', requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!isIdentifier(id)) return res.status(400).json({ error: 'Invalid category ID.' });
    const result = await withTransaction((client) => client.query(`SELECT * FROM gocart_category_delete($1)`, [id]));
    if (!result.rows.length) return res.status(404).json({ error: 'Category not found.' });
    res.sendStatus(204);
  } catch (error: any) {
    respondApiError(res, error, 'Error deleting category:');
  }
});

export default router;

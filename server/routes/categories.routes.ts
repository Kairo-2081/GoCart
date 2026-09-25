import { Router } from 'express';
import { query, withTransaction } from '../db/index.ts';
import { requireRole } from '../middleware/auth.ts';
import type { Category } from '../../src/types.ts';

const router = Router();

router.get('/api/categories', async (_req, res) => {
  try {
    const result = await query(`SELECT id, name FROM categories ORDER BY name ASC`);
    const formatted: Category[] = result.rows.map((c: any) => ({ Category_ID: c.id, Name: c.name }));
    res.json(formatted);
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.post('/api/categories', requireRole('admin'), async (req, res) => {
  try {
    const { Name } = req.body;
    if (!Name || !Name.trim()) return res.status(400).json({ error: 'Category Name is required' });
    const id = `CAT-${Date.now()}`;
    await withTransaction((client) => client.query(`INSERT INTO categories (id, name) VALUES ($1, $2)`, [id, Name.trim()]));
    res.status(201).json({ Category_ID: id, Name: Name.trim() });
  } catch (error: any) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

router.put('/api/categories/:id', requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { Name } = req.body;
    if (!Name || !Name.trim()) return res.status(400).json({ error: 'Category Name is required' });
    const result = await withTransaction((client) => client.query(`UPDATE categories SET name = $1 WHERE id = $2`, [Name.trim(), id]));
    if (!result.rowCount) return res.status(404).json({ error: 'Category not found' });
    res.json({ Category_ID: id, Name: Name.trim() });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update category' });
  }
});

router.delete('/api/categories/:id', requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    await withTransaction((client) => client.query(`DELETE FROM categories WHERE id = $1`, [id]));
    res.json({ success: true, message: 'Category deleted' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;

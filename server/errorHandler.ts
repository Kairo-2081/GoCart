import type { ErrorRequestHandler } from 'express';

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  console.error('Unhandled server error:', error);
  res.status(500).json({ error: 'Internal server error' });
};

export default errorHandler;

import express from 'express';
import { calculateCart } from '../controllers/cartController.js';
import { z } from 'zod';
import { validate } from '../utils/validate.js';

const router = express.Router();

const calculateSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          productId: z.string().min(1),
          qty: z.number().int().positive(),
          weight: z.string().min(1).optional().nullable(),
        })
      )
      .default([]),
  }),
  query: z.any().optional(),
  params: z.any().optional(),
});

router.post('/calculate', validate(calculateSchema), calculateCart);

export default router;


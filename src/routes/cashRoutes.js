import { Router } from 'express';

import { cashController } from '../controllers/cashController.js';
import { validateCashMovement } from '../validators/cashValidator.js';

const router = Router();

/**
 * Listar movimentações do caixa
 */
router.get(
    '/',
    cashController.getAll
);

/**
 * Status do caixa
 */
router.get(
    '/status',
    cashController.getStatus
);

/**
 * Abrir caixa
 */
router.post(
    '/open',
    cashController.open
);

/**
 * Fechar caixa
 */
router.post(
    '/close',
    cashController.close
);

/**
 * Lançar entrada/saída
 */
router.post(
    '/',
    validateCashMovement,
    cashController.createMovement
);

export default router;
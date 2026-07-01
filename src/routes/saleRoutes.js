import { Router } from 'express';

import { saleController } from '../controllers/saleController.js';
import { validateSale } from '../validators/saleValidator.js';

const router = Router();

/**
 * Listar vendas
 */
router.get(
    '/',
    saleController.getAll
);

/**
 * Buscar venda por ID
 */
router.get(
    '/:id',
    saleController.getById
);

/**
 * Cadastrar venda
 */
router.post(
    '/',
    validateSale,
    saleController.create
);

/**
 * Atualizar venda
 */
router.put(
    '/:id',
    validateSale,
    saleController.update
);

/**
 * Excluir venda
 */
router.delete(
    '/:id',
    saleController.delete
);

export default router;
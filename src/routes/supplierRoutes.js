import { Router } from 'express';

import { supplierController } from '../controllers/supplierController.js';
import { validateSupplier } from '../validators/supplierValidator.js';

const router = Router();

/**
 * Listar fornecedores
 */
router.get(
    '/',
    supplierController.getAll
);

/**
 * Buscar fornecedor
 */
router.get(
    '/:id',
    supplierController.getById
);

/**
 * Cadastrar fornecedor
 */
router.post(
    '/',
    validateSupplier,
    supplierController.create
);

/**
 * Atualizar fornecedor
 */
router.put(
    '/:id',
    validateSupplier,
    supplierController.update
);

/**
 * Excluir fornecedor
 */
router.delete(
    '/:id',
    supplierController.delete
);

export default router;
import { Router } from 'express';

import { partController } from '../controllers/partController.js';
import { validatePart } from '../validators/partValidator.js';

const router = Router();

/**
 * Listar peças
 */
router.get(
    '/',
    partController.getAll
);

/**
 * Buscar peça por ID
 */
router.get(
    '/:id',
    partController.getById
);

/**
 * Cadastrar peça
 */
router.post(
    '/',
    validatePart,
    partController.create
);

/**
 * Atualizar peça
 */
router.put(
    '/:id',
    validatePart,
    partController.update
);

/**
 * Excluir peça
 */
router.delete(
    '/:id',
    partController.delete
);

export default router;
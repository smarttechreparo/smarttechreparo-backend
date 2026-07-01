import { Router } from 'express';

import { serviceController } from '../controllers/serviceController.js';
import { validateService } from '../validators/serviceValidator.js';

const router = Router();

/**
 * Listar serviços
 */
router.get(
    '/',
    serviceController.getAll
);

/**
 * Buscar serviço por ID
 */
router.get(
    '/:id',
    serviceController.getById
);

/**
 * Cadastrar serviço
 */
router.post(
    '/',
    validateService,
    serviceController.create
);

/**
 * Atualizar serviço
 */
router.put(
    '/:id',
    validateService,
    serviceController.update
);

/**
 * Excluir serviço
 */
router.delete(
    '/:id',
    serviceController.delete
);

export default router;
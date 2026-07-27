import { Router } from 'express';

import { clientController } from '../controllers/clientController.js';
import { validateClient } from '../validators/clientValidator.js';

const router = Router();

/**
 * Listar todos os clientes
 */
router.get(
    '/',
    clientController.getAll
);

/**
 * Buscar cliente por ID
 */
router.get(
    '/:id',
    clientController.getById
);

/**
 * Cadastrar cliente
 */
router.post(
    '/',
    validateClient,
    clientController.create
);

/**
 * Atualizar cliente
 */
router.put(
    '/:id',
    validateClient,
    clientController.update
);

/**
 * Excluir cliente
 */
router.delete(
    '/:id',
    clientController.delete
);

export default router;
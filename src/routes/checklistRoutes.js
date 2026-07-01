import { Router } from 'express';
import multer from 'multer';

import { checklistController } from '../controllers/checklistController.js';
import { validateChecklist } from '../validators/checklistValidator.js';

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        files: 5,
        fileSize: 5 * 1024 * 1024
    },
    fileFilter(req, file, cb) {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Apenas imagens são permitidas.'));
        }

        cb(null, true);
    }
});

/**
 * Listar checklists
 */
router.get(
    '/',
    checklistController.getAll
);

/**
 * Buscar checklist por ID
 */
router.get(
    '/:id',
    checklistController.getById
);

/**
 * Listar checklists por serviço
 */
router.get(
    '/service/:serviceId',
    checklistController.getByService
);

/**
 * Criar checklist com fotos
 */
router.post(
    '/',
    upload.array('photos', 5),
    validateChecklist,
    checklistController.create
);

/**
 * Excluir checklist
 */
router.delete(
    '/:id',
    checklistController.delete
);

export default router;
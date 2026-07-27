import { Router } from 'express';

import { settingsController } from '../controllers/settingsController.js';

const router = Router();

/**
 * Buscar configurações
 */
router.get(
    '/',
    settingsController.getSettings
);

/**
 * Salvar configurações
 */
router.post(
    '/',
    settingsController.saveSettings
);

export default router;
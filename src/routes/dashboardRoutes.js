import { Router } from 'express';

import { dashboardController } from '../controllers/dashboardController.js';

const router = Router();

/**
 * Estatísticas do dashboard
 */
router.get(
    '/stats',
    dashboardController.getStats
);

export default router;
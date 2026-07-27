import { Router } from 'express';
import { cashController } from '../controllers/cashController.js';
import { validateCashMovement } from '../validators/cashValidator.js';

const router = Router();

router.get('/', cashController.getAll);
router.get('/status', cashController.getStatus);

router.post('/open', cashController.open);
router.post('/close', cashController.close);

router.post('/', validateCashMovement, cashController.createMovement);

router.delete('/:id', cashController.deleteMovement);

export default router;

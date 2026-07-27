import { Router } from 'express';

import { purchaseController } from '../controllers/purchaseController.js';

const router = Router();

router.get('/', purchaseController.getAll);

router.post('/', purchaseController.create);

router.delete('/:id', purchaseController.delete);

export default router;
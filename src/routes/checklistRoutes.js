import { Router } from 'express';
import multer from 'multer';
import { checklistController } from '../controllers/checklistController.js';

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter(req, file, callback) {
        if (!file.mimetype.startsWith('image/')) {
            return callback(new Error('Apenas imagens são permitidas.'));
        }

        callback(null, true);
    }
});

router.get('/', checklistController.getAll);
router.get('/service/:serviceId', checklistController.getByService);
router.get('/:id', checklistController.getById);
router.post('/', upload.array('photos', 10), checklistController.create);
router.delete('/:id', checklistController.delete);

export default router;

import { body, validationResult } from 'express-validator';

export const validateChecklist = [

    body('service_id')
        .optional({ checkFalsy: true })
        .isUUID()
        .withMessage('Serviço inválido.'),

    body('serviceId')
        .optional({ checkFalsy: true })
        .isUUID()
        .withMessage('Serviço inválido.'),

    body('type')
        .optional({ checkFalsy: true })
        .isIn(['entrada', 'saida', 'entrega', 'avaliacao'])
        .withMessage('Tipo de checklist inválido.'),

    body('items')
        .optional({ checkFalsy: true })
        .custom(value => {
            if (typeof value === 'string') {
                try {
                    JSON.parse(value);
                } catch {
                    throw new Error('Itens do checklist devem estar em JSON válido.');
                }
            }

            return true;
        }),

    (req, res, next) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: errors.array()[0].msg
            });
        }

        next();
    }

];
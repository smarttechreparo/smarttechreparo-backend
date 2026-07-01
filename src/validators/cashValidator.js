import { body, validationResult } from 'express-validator';

export const validateCashMovement = [

    body('type')
        .optional({ checkFalsy: true })
        .isIn(['entrada', 'saida'])
        .withMessage('Tipo de movimentação inválido.'),

    body('tipo')
        .optional({ checkFalsy: true })
        .isIn(['entrada', 'saida'])
        .withMessage('Tipo de movimentação inválido.'),

    body('amount')
        .optional({ checkFalsy: true })
        .isNumeric()
        .withMessage('Valor inválido.'),

    body('value')
        .optional({ checkFalsy: true })
        .isNumeric()
        .withMessage('Valor inválido.'),

    body('valor')
        .optional({ checkFalsy: true })
        .isNumeric()
        .withMessage('Valor inválido.'),

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
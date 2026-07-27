import { body, validationResult } from 'express-validator';

export const validateSale = [

    body('client_id')
        .optional({ checkFalsy: true })
        .isUUID()
        .withMessage('Cliente inválido.'),

    body('clientId')
        .optional({ checkFalsy: true })
        .isUUID()
        .withMessage('Cliente inválido.'),

    body('items')
        .isArray({ min: 1 })
        .withMessage('A venda precisa ter pelo menos um item.'),

    body('total_amount')
        .optional({ checkFalsy: true })
        .isNumeric()
        .withMessage('O total da venda deve ser numérico.'),

    body('total')
        .optional({ checkFalsy: true })
        .isNumeric()
        .withMessage('O total da venda deve ser numérico.'),

    body('discount_amount')
        .optional({ checkFalsy: true })
        .isNumeric()
        .withMessage('O desconto deve ser numérico.'),

    body('discount')
        .optional({ checkFalsy: true })
        .isNumeric()
        .withMessage('O desconto deve ser numérico.'),

    body('payment_method')
        .optional({ checkFalsy: true })
        .trim()
        .notEmpty()
        .withMessage('Forma de pagamento inválida.'),

    body('paymentMethod')
        .optional({ checkFalsy: true })
        .trim()
        .notEmpty()
        .withMessage('Forma de pagamento inválida.'),

    body('status')
        .optional({ checkFalsy: true })
        .isIn([
            'concluida',
            'pendente',
            'cancelada',
            'orcamento',
            'paga'
        ])
        .withMessage('Status da venda inválido.'),

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
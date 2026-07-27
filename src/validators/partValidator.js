import { body, validationResult } from 'express-validator';

export const validatePart = [

    body('name')
        .trim()
        .notEmpty()
        .withMessage('O nome da peça é obrigatório.')
        .isLength({ min: 2 })
        .withMessage('O nome da peça deve ter pelo menos 2 caracteres.'),

    body('quantity')
        .optional({ checkFalsy: true })
        .isNumeric()
        .withMessage('A quantidade deve ser um número.'),

    body('cost_price')
        .optional({ checkFalsy: true })
        .isNumeric()
        .withMessage('O preço de custo deve ser um número.'),

    body('sale_price')
        .optional({ checkFalsy: true })
        .isNumeric()
        .withMessage('O preço de venda deve ser um número.'),

    body('min_stock')
        .optional({ checkFalsy: true })
        .isNumeric()
        .withMessage('O estoque mínimo deve ser um número.'),

    body('supplier_id')
        .optional({ checkFalsy: true })
        .isUUID()
        .withMessage('Fornecedor inválido.'),

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
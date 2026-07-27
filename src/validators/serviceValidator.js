import { body, validationResult } from 'express-validator';

export const validateService = [

    body('client_id')
        .optional({ checkFalsy: true })
        .isUUID()
        .withMessage('Cliente inválido.'),

    body('clientId')
        .optional({ checkFalsy: true })
        .isUUID()
        .withMessage('Cliente inválido.'),

    body('equipment')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ min: 2 })
        .withMessage('O equipamento deve ter pelo menos 2 caracteres.'),

    body('device_model')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ min: 2 })
        .withMessage('O modelo do dispositivo deve ter pelo menos 2 caracteres.'),

    body('value')
        .optional({ checkFalsy: true })
        .isNumeric()
        .withMessage('O valor da mão de obra deve ser numérico.'),

    body('status')
        .optional({ checkFalsy: true })
        .isIn([
            'orcamento',
            'em_andamento',
            'aguardando_peca',
            'finalizado',
            'entregue',
            'cancelado',
            'convertido'
        ])
        .withMessage('Status de serviço inválido.'),

    (req, res, next) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: errors.array()[0].msg
            });
        }

        const equipment =
            req.body.equipment ||
            req.body.device_model;

        if (!equipment || !String(equipment).trim()) {
            return res.status(400).json({
                success: false,
                error: 'O equipamento é obrigatório.'
            });
        }

        next();
    }
];
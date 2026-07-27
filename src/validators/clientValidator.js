import { body, validationResult } from 'express-validator';

const onlyDigits = (value = '') => String(value || '').replace(/\D/g, '');

export const validateClient = [
    body('name')
        .customSanitizer(value => String(value || '').trim())
        .notEmpty().withMessage('O nome do cliente e obrigatorio.')
        .isLength({ min: 3 }).withMessage('O nome deve ter pelo menos 3 caracteres.'),

    body('phone')
        .customSanitizer(onlyDigits)
        .notEmpty().withMessage('O telefone e obrigatorio.')
        .isLength({ min: 10, max: 11 }).withMessage('Informe um telefone com DDD.'),

    body('email')
        .optional({ checkFalsy: true })
        .trim()
        .isEmail().withMessage('O formato do e-mail inserido e invalido.'),

    body('document')
        .optional({ checkFalsy: true })
        .customSanitizer(onlyDigits)
        .custom(value => {
            if (!value) return true;
            if (![11, 14].includes(value.length)) {
                throw new Error('CPF/CNPJ deve ter 11 ou 14 digitos.');
            }
            return true;
        }),

    body('cep')
        .optional({ checkFalsy: true })
        .customSanitizer(onlyDigits)
        .isLength({ min: 8, max: 8 }).withMessage('CEP deve ter 8 digitos.'),

    body(['address', 'number', 'complement', 'district', 'city'])
        .optional({ checkFalsy: true })
        .trim(),

    body('state')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ min: 2, max: 2 }).withMessage('Estado deve ter 2 letras.')
        .toUpperCase(),

    (req, res, next) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: errors.array()[0].msg,
                errors: errors.array()
            });
        }

        next();
    }
];

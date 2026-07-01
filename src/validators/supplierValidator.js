import { body, validationResult } from 'express-validator';

const onlyDigits = (value = '') => String(value || '').replace(/\D/g, '');

export const validateSupplier = [
    body('name')
        .customSanitizer(value => String(value || '').trim())
        .notEmpty().withMessage('O nome do fornecedor e obrigatorio.')
        .isLength({ min: 3 }).withMessage('O nome deve possuir pelo menos 3 caracteres.'),

    body('contact')
        .optional({ checkFalsy: true })
        .trim(),

    body('phone')
        .customSanitizer(onlyDigits)
        .notEmpty().withMessage('O telefone do fornecedor e obrigatorio.')
        .isLength({ min: 10, max: 11 }).withMessage('Informe um telefone com DDD.'),

    body('email')
        .optional({ checkFalsy: true })
        .trim()
        .isEmail().withMessage('E-mail invalido.'),

    body('document')
        .optional({ checkFalsy: true })
        .customSanitizer(onlyDigits)
        .isLength({ min: 14, max: 14 }).withMessage('CNPJ deve ter 14 digitos.'),

    body(['category', 'address', 'city', 'notes'])
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

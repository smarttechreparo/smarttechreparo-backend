import jwt from 'jsonwebtoken';

const COOKIE_NAME = 'admin_token';

export function requireAuth(req, res, next) {
    try {
        const token =
            req.cookies?.[COOKIE_NAME] ||
            req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Não autenticado.'
            });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                success: false,
                error: 'JWT_SECRET não configurado no servidor.'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = {
            id: decoded.id,
            name: decoded.name,
            email: decoded.email,
            role: decoded.role || 'admin'
        };

        req.admin = req.user;

        return next();

    } catch (error) {
        console.error('Erro na autenticação:', error.message);

        return res.status(401).json({
            success: false,
            error: 'Sessão inválida ou expirada.'
        });
    }
}

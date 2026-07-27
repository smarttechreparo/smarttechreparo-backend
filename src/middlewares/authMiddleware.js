import jwt from 'jsonwebtoken';

function getTokenFromRequest(req) {
    const authHeader = req.headers.authorization || '';

    if (authHeader.startsWith('Bearer ')) {
        return authHeader.replace('Bearer ', '').trim();
    }

    return req.cookies?.admin_session || req.cookies?.token || null;
}

export function requireAuth(req, res, next) {
    try {
        const token = getTokenFromRequest(req);

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Não autenticado.'
            });
        }

        const secret = process.env.JWT_SECRET;

        if (!secret) {
            console.error('JWT_SECRET não configurado no Railway.');
            return res.status(500).json({
                success: false,
                error: 'JWT_SECRET não configurado no servidor.'
            });
        }

        const decoded = jwt.verify(token, secret);
        req.user = decoded;
        req.admin = decoded;

        return next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            error: 'Sessão inválida ou expirada.'
        });
    }
}

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
    : null;

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 1000 * 60 * 60 * 8,
    path: '/'
};

function sanitizeUser(user) {
    if (!user) return null;

    return {
        id: user.id,
        name: user.name || user.nome || user.email,
        email: user.email,
        role: user.role || user.perfil || 'admin'
    };
}

async function findAdminByEmail(email) {
    if (!supabase) {
        throw new Error('Supabase não configurado. Verifique SUPABASE_URL e SUPABASE_SERVICE_KEY no Railway.');
    }

    const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('email', email)
        .maybeSingle();

    if (error) throw error;
    return data;
}

export async function login(req, res) {
    try {
        const email = String(req.body?.email || '').trim().toLowerCase();
        const password = String(req.body?.password || '');

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Informe e-mail e senha.'
            });
        }

        const admin = await findAdminByEmail(email);

        if (!admin) {
            return res.status(401).json({
                success: false,
                error: 'E-mail ou senha inválidos.'
            });
        }

        if (admin.active === false || admin.is_active === false) {
            return res.status(403).json({
                success: false,
                error: 'Usuário desativado.'
            });
        }

        const hash = admin.password_hash || admin.passwordHash || admin.senha_hash;

        if (!hash) {
            return res.status(500).json({
                success: false,
                error: 'Usuário sem senha cadastrada no banco.'
            });
        }

        const passwordOk = await bcrypt.compare(password, hash);

        if (!passwordOk) {
            return res.status(401).json({
                success: false,
                error: 'E-mail ou senha inválidos.'
            });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                success: false,
                error: 'JWT_SECRET não configurado no servidor.'
            });
        }

        const safeUser = sanitizeUser(admin);

        const token = jwt.sign(
            safeUser,
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );
res.cookie('admin_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
});

    } catch (error) {
        console.error('Erro no login:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Erro ao fazer login.'
        });
    }
}

export async function me(req, res) {
    return res.status(200).json({
        success: true,
        user: req.user || null
    });
}

export async function logout(req, res) {
    res.clearCookie('admin_session', cookieOptions);

    return res.status(200).json({
        success: true,
        message: 'Logout realizado com sucesso.'
    });
}

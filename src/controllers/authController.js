import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
    supabaseUrl && supabaseKey
        ? createClient(supabaseUrl, supabaseKey, {
              auth: {
                  autoRefreshToken: false,
                  persistSession: false
              }
          })
        : null;

const COOKIE_NAME = 'admin_token';

// Agora usando proxy da Vercel:
// smarttechreparo-frontend.vercel.app/api → Railway
const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
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
        throw new Error(
            'Supabase não configurado. Verifique SUPABASE_URL e SUPABASE_SERVICE_KEY no Railway.'
        );
    }

    const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('email', email)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data;
}

// ==========================================
// LOGIN
// ==========================================
export async function login(req, res) {
    try {
        console.log('🔐 Tentativa de login recebida');

        const email = String(req.body?.email || '')
            .trim()
            .toLowerCase();

        const password = String(req.body?.password || '');

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Informe e-mail e senha.'
            });
        }

        console.log('🔎 Buscando administrador:', email);

        const admin = await findAdminByEmail(email);

        if (!admin) {
            console.warn('⚠️ Administrador não encontrado:', email);

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

        const hash =
            admin.password_hash ||
            admin.passwordHash ||
            admin.senha_hash;

        if (!hash) {
            console.error('❌ Usuário sem password_hash:', email);

            return res.status(500).json({
                success: false,
                error: 'Usuário sem senha cadastrada no banco.'
            });
        }

        console.log('🔑 Comparando senha...');

        const passwordOk = await bcrypt.compare(password, hash);

        if (!passwordOk) {
            console.warn('⚠️ Senha inválida:', email);

            return res.status(401).json({
                success: false,
                error: 'E-mail ou senha inválidos.'
            });
        }

        if (!process.env.JWT_SECRET) {
            console.error('❌ JWT_SECRET não configurado.');

            return res.status(500).json({
                success: false,
                error: 'JWT_SECRET não configurado no servidor.'
            });
        }

        const safeUser = sanitizeUser(admin);

        const token = jwt.sign(
            safeUser,
            process.env.JWT_SECRET,
            {
                expiresIn: '7d'
            }
        );

        // IMPORTANTE:
        // res.cookie fica DENTRO da função login,
        // porque aqui req e res realmente existem.
        res.cookie(
            COOKIE_NAME,
            token,
            cookieOptions
        );

        console.log(
            '✅ Login realizado com sucesso:',
            safeUser.email
        );

        return res.status(200).json({
            success: true,
            message: 'Login realizado com sucesso.',
            user: safeUser
        });

    } catch (error) {
        console.error('❌ Erro no login:', error);

        return res.status(500).json({
            success: false,
            error:
                error.message ||
                'Erro ao fazer login.'
        });
    }
}

// ==========================================
// VERIFICAR SESSÃO
// ==========================================
export async function me(req, res) {
    try {
        const user = req.user || req.admin || null;

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Não autenticado.'
            });
        }

        return res.status(200).json({
            success: true,
            user
        });

    } catch (error) {
        console.error(
            '❌ Erro ao verificar sessão:',
            error
        );

        return res.status(500).json({
            success: false,
            error: 'Erro ao verificar sessão.'
        });
    }
}

// ==========================================
// LOGOUT
// ==========================================
export async function logout(req, res) {
    try {
        res.clearCookie(COOKIE_NAME, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            path: '/'
        });

        return res.status(200).json({
            success: true,
            message: 'Logout realizado com sucesso.'
        });

    } catch (error) {
        console.error('❌ Erro no logout:', error);

        return res.status(500).json({
            success: false,
            error: 'Erro ao sair do sistema.'
        });
    }
}

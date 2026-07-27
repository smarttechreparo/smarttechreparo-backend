import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

// ==========================
// ROTAS
// ==========================
import authRoutes from './src/routes/authRoutes.js';

import purchaseRoutes from './src/routes/purchaseRoutes.js';
import expenseRoutes from './src/routes/expenseRoutes.js';
import clientRoutes from './src/routes/clientRoutes.js';
import supplierRoutes from './src/routes/supplierRoutes.js';
import partRoutes from './src/routes/partRoutes.js';
import serviceRoutes from './src/routes/serviceRoutes.js';
import saleRoutes from './src/routes/saleRoutes.js';
import cashRoutes from './src/routes/cashRoutes.js';
import checklistRoutes from './src/routes/checklistRoutes.js';
import dashboardRoutes from './src/routes/dashboardRoutes.js';
import settingsRoutes from './src/routes/settingsRoutes.js';

// ==========================
// MIDDLEWARES
// ==========================
import { requireAuth } from './src/middlewares/authMiddleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================
// CORS
// ==========================
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5500',
    'https://smarttechreparo-frontend.vercel.app'
];

app.use(cors({
    origin(origin, callback) {
        // Permite Postman, navegador direto e health checks
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) return callback(null, true);

        // Permite previews da Vercel
        if (origin.endsWith('.vercel.app')) return callback(null, true);

        console.warn('CORS bloqueado para origem:', origin);
        return callback(new Error('Origem não permitida pelo CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// ==========================
// PARSERS
// ==========================
app.use(cookieParser());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// ==========================
// ROTAS PÚBLICAS
// ==========================
app.get('/', (req, res) => {
    return res.status(200).json({
        success: true,
        message: 'LOGIN V3 ATIVO - SERVIDOR NOVO',
        status: 'online',
        auth: true,
        version: 'login-v3',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/version', (req, res) => {
    return res.status(200).json({
        success: true,
        app: 'Smart Tech Reparo Backend',
        version: 'login-v3',
        authRoutes: true,
        routes: [
            'POST /api/auth/login',
            'GET /api/auth/me',
            'POST /api/auth/logout'
        ],
        timestamp: new Date().toISOString()
    });
});

app.get('/api/test-connection', (req, res) => {
    return res.status(200).json({
        success: true,
        message: 'Backend conectado com sucesso.',
        version: 'login-v3',
        timestamp: new Date().toISOString()
    });
});

// ==========================
// AUTENTICAÇÃO
// ==========================
// Precisa ficar antes do requireAuth
app.use('/api/auth', authRoutes);

// ==========================
// PROTEÇÃO GLOBAL DA API
// ==========================
// Tudo abaixo exige login
app.use('/api', requireAuth);

// ==========================
// ROTAS PRINCIPAIS PROTEGIDAS
// ==========================
app.use('/api/clients', clientRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/parts', partRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/cash', cashRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/checklist', checklistRoutes);
app.use('/api', dashboardRoutes);
app.use('/api/settings', settingsRoutes);

// ==========================
// 404
// ==========================
app.use((req, res) => {
    return res.status(404).json({
        success: false,
        error: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
        version: 'login-v3'
    });
});

// ==========================
// TRATAMENTO GLOBAL DE ERROS
// ==========================
app.use((error, req, res, next) => {
    console.error('Erro global:', error);

    if (error.message === 'Origem não permitida pelo CORS') {
        return res.status(403).json({
            success: false,
            error: 'Origem não permitida pelo CORS.',
            version: 'login-v3'
        });
    }

    if (error.message === 'Apenas imagens são permitidas.') {
        return res.status(400).json({
            success: false,
            error: error.message,
            version: 'login-v3'
        });
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            error: 'Arquivo muito grande. Limite máximo de 5MB por foto.',
            version: 'login-v3'
        });
    }

    return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor.',
        version: 'login-v3'
    });
});

// ==========================
// LOGS DE INICIALIZAÇÃO
// ==========================
console.log('🔥 SERVIDOR LOGIN V3 INICIADO');
console.log('🔐 AUTH ROUTES CARREGADAS');
console.log('➡ POST /api/auth/login');
console.log('➡ GET  /api/auth/me');
console.log('➡ POST /api/auth/logout');
console.log(`🌐 Porta configurada: ${PORT}`);

// ==========================
// START SERVER
// ==========================
app.listen(PORT, () => {
    console.log(`✅ API Smart Tech Reparo LOGIN V3 rodando na porta ${PORT}`);
});

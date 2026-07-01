import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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
        if (!origin) {
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        if (origin.endsWith('.vercel.app')) {
            return callback(null, true);
        }

        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// IMPORTANTE:
// Não usar app.options('(.*)', cors())
// Isso quebra no Express 5.

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// ==========================
// ROTA RAIZ
// ==========================
app.get('/', (req, res) => {
    return res.status(200).json({
        success: true,
        message: 'API Smart Tech Reparo rodando normalmente.',
        status: 'online'
    });
});

// ==========================
// TESTE DE CONEXÃO
// ==========================
app.get('/api/test-connection', (req, res) => {
    return res.status(200).json({
        success: true,
        message: 'Backend conectado com sucesso.',
        timestamp: new Date().toISOString()
    });
});

// ==========================
// ROTAS PRINCIPAIS
// ==========================
app.use('/api/clients', clientRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/parts', partRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/cash', cashRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/expenses', expenseRoutes);

// Mantém compatibilidade com o frontend atual:
// /api/checklist
app.use('/api/checklist', checklistRoutes);

// Dashboard:
// dashboardRoutes tem GET /stats
// então aqui fica GET /api/stats
app.use('/api', dashboardRoutes);

// Settings:
// GET  /api/settings
// POST /api/settings
app.use('/api/settings', settingsRoutes);

// ==========================
// ROTAS TEMPORÁRIAS DE SENHA
// ==========================
// Mantém compatibilidade com o renderer.js atual.
// Depois podemos trocar por autenticação real.
let temporaryPassword = process.env.ADMIN_PASSWORD || 'admin123';

app.get('/api/auth/password', (req, res) => {
    return res.status(200).json({
        success: true,
        password: temporaryPassword
    });
});

app.post('/api/auth/password', (req, res) => {
    const { newPassword } = req.body;

    if (!newPassword || String(newPassword).length < 4) {
        return res.status(400).json({
            success: false,
            error: 'A nova senha deve ter pelo menos 4 caracteres.'
        });
    }

    temporaryPassword = String(newPassword);

    return res.status(200).json({
        success: true,
        message: 'Senha atualizada temporariamente.'
    });
});

// ==========================
// 404
// ==========================
app.use((req, res) => {
    return res.status(404).json({
        success: false,
        error: `Rota não encontrada: ${req.method} ${req.originalUrl}`
    });
});

// ==========================
// TRATAMENTO GLOBAL DE ERROS
// ==========================
app.use((error, req, res, next) => {
    console.error('Erro global:', error);

    if (error.message === 'Apenas imagens são permitidas.') {
        return res.status(400).json({
            success: false,
            error: error.message
        });
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            error: 'Arquivo muito grande. Limite máximo de 5MB por foto.'
        });
    }

    return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor.'
    });
});

// ==========================
// START SERVER
// ==========================
app.listen(PORT, () => {
    console.log(`✅ API Smart Tech Reparo rodando na porta ${PORT}`);
});
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();

// ==========================
// MIDDLEWARES
// ==========================
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

// ==========================
// SUPABASE
// ==========================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("❌ SUPABASE_URL ou SUPABASE_SERVICE_KEY não configurados no ambiente!");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

console.log('✅ Supabase conectado');

// ==========================
// HEALTH CHECK
// ==========================
app.get('/', (req, res) => {
    res.json({ success: true, message: 'API rodando normalmente' });
});

// ==========================
// CASH REGISTER
// ==========================
app.post('/api/cash/open', async (req, res) => {
    try {
        const { openingBalance, notes } = req.body;

        const { data: activeBox } = await supabaseAdmin
            .from('cash_registers')
            .select('*')
            .eq('status', 'aberto')
            .maybeSingle();

        if (activeBox) {
            return res.status(400).json({
                success: false,
                error: 'Já existe um caixa aberto'
            });
        }

        const { data, error } = await supabaseAdmin
            .from('cash_registers')
            .insert([{
                status: 'aberto',
                opening_balance: Number(openingBalance) || 0,
                notes: notes || ''
            }])
            .select();

        if (error) throw error;

        res.json({ success: true, data: data[0] });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================
// CHECKLIST + FOTOS
// ==========================
app.post('/api/checklist', upload.array('photos', 5), async (req, res) => {
    try {
        const { serviceId, type, items, observations } = req.body;
        const files = req.files;

        const { data: checklistData, error } = await supabaseAdmin
            .from('device_checklists')
            .insert([{
                service_id: serviceId || null,
                type,
                items: typeof items === 'string' ? JSON.parse(items) : items,
                observations: observations || ''
            }])
            .select();

        if (error) throw error;

        const checklistId = checklistData[0].id;

        // upload de fotos
        if (files?.length) {
            for (const file of files) {
                const ext = file.originalname.split('.').pop();
                const fileName = `${checklistId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

                const { error: uploadError } = await supabaseAdmin.storage
                    .from('device-photos')
                    .upload(fileName, file.buffer, {
                        contentType: file.mimetype,
                        upsert: true
                    });

                if (uploadError) throw uploadError;

                const { data: urlData } = supabaseAdmin.storage
                    .from('device-photos')
                    .getPublicUrl(fileName);

                await supabaseAdmin
                    .from('checklist_photos')
                    .insert([{
                        checklist_id: checklistId,
                        photo_url: urlData.publicUrl
                    }]);
            }
        }

        res.json({
            success: true,
            checklistId,
            message: 'Checklist criado com sucesso'
        });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================
// CLIENTES (frontend usa isso)
// ==========================
app.get('/api/clients', async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('clients')
            .select('*')
            .order('id', { ascending: false });

        if (error) throw error;

        res.json({ success: true, data });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/clients', async (req, res) => {
    try {
        const { name, phone, email } = req.body;

        const { data, error } = await supabaseAdmin
            .from('clients')
            .insert([{ name, phone, email }])
            .select();

        if (error) throw error;

        res.json({ success: true, data: data[0] });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================
// STATS (dashboard)
// ==========================
app.get('/api/stats', async (req, res) => {
    try {
        const { count: clients } = await supabaseAdmin
            .from('clients')
            .select('*', { count: 'exact', head: true });

        const { count: checklists } = await supabaseAdmin
            .from('device_checklists')
            .select('*', { count: 'exact', head: true });

        res.json({
            success: true,
            data: {
                clients: clients || 0,
                checklists: checklists || 0
            }
        });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================
// SALES (simples placeholder)
// ==========================
app.get('/api/sales', async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('sales')
            .select('*');

        if (error) throw error;

        res.json({ success: true, data });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================
// SETTINGS (placeholder)
// ==========================
app.get('/api/settings', async (req, res) => {
    res.json({
        success: true,
        data: {
            system: "Smart Tech Reparo",
            version: "1.0"
        }
    });
});

// ==========================
// START SERVER
// ==========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

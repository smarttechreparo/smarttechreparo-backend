const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js'); // Importa direto aqui
require('dotenv').config();

const app = express();
// ==========================================
// CONFIGURAÇÃO DO CORS CORRETA (EXPRESS 5+)
// ==========================================
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// Para o preflight (OPTIONS), use uma RegExp compatível ou remova a linha abaixo, 
// pois o próprio middleware do cors() já costuma tratar o OPTIONS automaticamente.
app.options('(.*)', cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

// ==========================================
// INICIALIZAÇÃO DIRETA DO SUPABASE (Sem arquivo externo)
// ==========================================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ ERRO: Chaves do Supabase não encontradas nas variáveis de ambiente!");
}

// Cria o cliente que as rotas abaixo vão usar
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

console.log('✅ Conexão com o Supabase configurada no servidor.');

// ==========================================
// 💰 SISTEMA DE CAIXA
// ==========================================
app.post('/api/cash/open', async (req, res) => {
    try {
        const { openingBalance, notes } = req.body;

        const { data: activeBox } = await supabaseAdmin
            .from('cash_registers')
            .select('*')
            .eq('status', 'aberto')
            .maybeSingle();

        if (activeBox) {
            return res.status(400).json({ success: false, error: 'Já existe um caixa aberto no sistema.' });
        }

        const { data, error } = await supabaseAdmin
            .from('cash_registers')
            .insert([{
                status: 'aberto',
                opening_balance: parseFloat(openingBalance) || 0,
                notes: notes || ''
            }])
            .select();

        if (error) throw error;
        res.json({ success: true, data: data[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// 📱 CHECKLIST DE DISPOSITIVOS COM FOTOS
// ==========================================
app.post('/api/checklist', upload.array('photos', 5), async (req, res) => {
    try {
        const { serviceId, type, items, observations } = req.body;
        const files = req.files;

        const { data: checklistData, error: checklistError } = await supabaseAdmin
            .from('device_checklists')
            .insert([{
                service_id: serviceId || null,
                type: type,
                items: typeof items === 'string' ? JSON.parse(items) : items,
                observations: observations || ''
            }])
            .select();

        if (checklistError) throw checklistError;
        const checklistId = checklistData[0].id;

        if (files && files.length > 0) {
            for (const file of files) {
                const fileExt = file.originalname.split('.').pop();
                const fileName = `${checklistId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                
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

        res.json({ success: true, checklistId, message: 'Checklist e imagens salvos com sucesso.' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Inicialização do Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor Web rodando perfeitamente na porta ${PORT}`);
});

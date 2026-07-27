// supabaseClient.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ ERRO CRÍTICO: Variáveis de ambiente do Supabase não foram carregadas no .env!");
    process.exit(1); // Desliga o servidor se as chaves estiverem faltando
}

// Inicializa o cliente administrativo com a Service Key (Super poderes no backend)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

console.log('✅ Conexão administrativa com o Supabase instanciada com sucesso.');

// Exporta o cliente pronto para ser usado em qualquer lugar da API
module.exports = supabaseAdmin;
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carrega as variáveis do arquivo .env
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Validação de segurança em ambiente de desenvolvimento e produção
if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ ERRO CRÍTICO: Variáveis de ambiente do Supabase não foram carregadas no .env!");
    process.exit(1); // Desliga o servidor imediatamente para evitar erros silenciosos em produção
}

// Inicializa o cliente administrativo com a Service Key (Super poderes no backend)
// Desabilitar o autoRefreshToken e persistSession é uma boa prática para servidores Express
// pois economiza memória e evita vazamento de escopo entre requisições de clientes diferentes
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

console.log('✅ Conexão administrativa com o Supabase instanciada usando ES Modules.');
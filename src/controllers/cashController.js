import { supabase } from '../config/supabaseClient.js';

async function getOpenCashRegister() {
    const { data, error } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('status', 'aberto')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) throw error;

    return data;
}

export const cashController = {

    // ==========================
    // STATUS DO CAIXA
    // ==========================
    async getStatus(req, res) {
        try {
            const cashRegister = await getOpenCashRegister();

            return res.status(200).json({
                success: true,
                data: {
                    isOpen: !!cashRegister,
                    cashRegister
                }
            });

        } catch (error) {
            console.error('Erro ao verificar status do caixa:', error);

            return res.status(500).json({
                success: false,
                error: 'Erro ao verificar status do caixa.'
            });
        }
    },

    // ==========================
    // LISTAR MOVIMENTAÇÕES
    // ==========================
    async getAll(req, res) {
        try {
            const { data, error } = await supabase
                .from('cash_movements')
                .select(`
                    id,
                    cash_register_id,
                    type,
                    description,
                    amount,
                    payment_method,
                    reference_type,
                    reference_id,
                    created_at
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return res.status(200).json({
                success: true,
                data: data || []
            });

        } catch (error) {
            console.error('Erro ao listar movimentações do caixa:', error);

            return res.status(500).json({
                success: false,
                error: 'Erro ao listar movimentações do caixa.'
            });
        }
    },

    // ==========================
    // ABRIR CAIXA
    // ==========================
    async open(req, res) {
        try {
            const { openingBalance, opening_balance, notes } = req.body;

            const activeCash = await getOpenCashRegister();

            if (activeCash) {
                return res.status(400).json({
                    success: false,
                    error: 'Já existe um caixa aberto.'
                });
            }

            const balance = Number(openingBalance ?? opening_balance ?? 0) || 0;

            const { data, error } = await supabase
                .from('cash_registers')
                .insert([{
                    status: 'aberto',
                    opening_balance: balance,
                    notes: notes || '',
                    opened_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) throw error;

            if (balance > 0) {
                await supabase
                    .from('cash_movements')
                    .insert([{
                        cash_register_id: data.id,
                        type: 'entrada',
                        description: 'Saldo inicial do caixa',
                        amount: balance,
                        payment_method: 'dinheiro',
                        reference_type: 'opening_balance'
                    }]);
            }

            return res.status(201).json({
                success: true,
                data
            });

        } catch (error) {
            console.error('Erro ao abrir caixa:', error);

            return res.status(500).json({
                success: false,
                error: 'Erro ao abrir caixa.'
            });
        }
    },

    // ==========================
    // LANÇAR ENTRADA/SAÍDA
    // ==========================
    async createMovement(req, res) {
        try {
            const cashRegister = await getOpenCashRegister();

            if (!cashRegister) {
                return res.status(400).json({
                    success: false,
                    error: 'Não existe caixa aberto.'
                });
            }

            const entry = req.body || {};

            const type = entry.type || entry.tipo;
            const amount = Number(entry.amount ?? entry.value ?? entry.valor ?? 0) || 0;

            if (!['entrada', 'saida'].includes(type)) {
                return res.status(400).json({
                    success: false,
                    error: 'Tipo de movimentação inválido.'
                });
            }

            if (amount <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Valor da movimentação deve ser maior que zero.'
                });
            }

            const { data, error } = await supabase
                .from('cash_movements')
                .insert([{
                    cash_register_id: cashRegister.id,
                    type,
                    description: entry.description || entry.descricao || 'Movimentação de caixa',
                    amount,
                    payment_method: entry.payment_method || entry.paymentMethod || 'dinheiro',
                    reference_type: entry.reference_type || entry.referenceType || null,
                    reference_id: entry.reference_id || entry.referenceId || null
                }])
                .select()
                .single();

            if (error) throw error;

            return res.status(201).json({
                success: true,
                data
            });

        } catch (error) {
            console.error('Erro ao lançar movimentação:', error);

            return res.status(500).json({
                success: false,
                error: 'Erro ao lançar movimentação no caixa.'
            });
        }
    },

    // ==========================
    // FECHAR CAIXA
    // ==========================
    async close(req, res) {
        try {
            const { closingBalance, closing_balance, notes } = req.body;

            const cashRegister = await getOpenCashRegister();

            if (!cashRegister) {
                return res.status(400).json({
                    success: false,
                    error: 'Não existe caixa aberto.'
                });
            }

            const { data: movements, error: movementsError } = await supabase
                .from('cash_movements')
                .select('type, amount')
                .eq('cash_register_id', cashRegister.id);

            if (movementsError) throw movementsError;

            const calculatedBalance = (movements || []).reduce((sum, item) => {
                const amount = Number(item.amount) || 0;

                if (item.type === 'entrada') return sum + amount;
                if (item.type === 'saida') return sum - amount;

                return sum;
            }, 0);

            const finalBalance = Number(closingBalance ?? closing_balance ?? calculatedBalance) || 0;

            const { data, error } = await supabase
                .from('cash_registers')
                .update({
                    status: 'fechado',
                    closing_balance: finalBalance,
                    closed_at: new Date().toISOString(),
                    notes: notes || cashRegister.notes || ''
                })
                .eq('id', cashRegister.id)
                .select()
                .single();

            if (error) throw error;

            return res.status(200).json({
                success: true,
                data: {
                    ...data,
                    calculated_balance: calculatedBalance
                }
            });

        } catch (error) {
            console.error('Erro ao fechar caixa:', error);

            return res.status(500).json({
                success: false,
                error: 'Erro ao fechar caixa.'
            });
        }
    }

};
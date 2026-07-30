import { supabase } from '../config/supabaseClient.js';

function toNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

async function getOpenCashRegister() {
    const { data, error } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('status', 'aberto')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('Erro ao buscar caixa aberto:', error);
        throw error;
    }

    return data;
}

async function calculateCashBalance(cashRegisterId, openingBalance = 0) {
    const { data: movements, error } = await supabase
        .from('cash_movements')
        .select('*')
        .eq('cash_register_id', cashRegisterId);

    if (error) {
        console.error('Erro ao calcular saldo do caixa:', error);
        throw error;
    }

    const totalEntries = (movements || [])
        .filter(item => item.type === 'entrada')
        .reduce((sum, item) => sum + toNumber(item.amount), 0);

    const totalExits = (movements || [])
        .filter(item => item.type === 'saida')
        .reduce((sum, item) => sum + toNumber(item.amount), 0);

    return {
        totalEntries,
        totalExits,
        balance: toNumber(openingBalance) + totalEntries - totalExits
    };
}

export const cashController = {
    async getStatus(req, res) {
        try {
            const cashRegister = await getOpenCashRegister();

            if (!cashRegister) {
                return res.status(200).json({
                    success: true,
                    data: {
                        isOpen: false,
                        status: 'fechado',
                        cashRegister: null,
                        cash_register: null,
                        opening_balance: 0,
                        total_entries: 0,
                        total_exits: 0,
                        current_balance: 0
                    }
                });
            }

            const balanceData = await calculateCashBalance(
                cashRegister.id,
                cashRegister.opening_balance
            );

            return res.status(200).json({
                success: true,
                data: {
                    isOpen: true,
                    status: 'aberto',
                    cashRegister,
                    cash_register: cashRegister,
                    opening_balance: toNumber(cashRegister.opening_balance),
                    total_entries: balanceData.totalEntries,
                    total_exits: balanceData.totalExits,
                    current_balance: balanceData.balance
                }
            });

        } catch (error) {
            console.error('Erro ao buscar status do caixa:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Erro ao buscar status do caixa.'
            });
        }
    },

    async getAll(req, res) {
        try {
            const { data, error } = await supabase
                .from('cash_movements')
                .select('*')
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
                error: error.message || 'Erro ao listar movimentações do caixa.'
            });
        }
    },

    async open(req, res) {
        try {
            const alreadyOpen = await getOpenCashRegister();

            if (alreadyOpen) {
                return res.status(400).json({
                    success: false,
                    error: 'Já existe um caixa aberto.'
                });
            }

            const openingBalance = toNumber(
                req.body.opening_balance ?? req.body.openingBalance ?? 0
            );

            const notes = req.body.notes || '';

            const { data: cashRegister, error } = await supabase
                .from('cash_registers')
                .insert({
                    opening_balance: openingBalance,
                    closing_balance: 0,
                    status: 'aberto',
                    opened_at: new Date().toISOString(),
                    notes,
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;

            return res.status(201).json({
                success: true,
                data: cashRegister,
                message: 'Caixa aberto com sucesso.'
            });

        } catch (error) {
            console.error('Erro ao abrir caixa:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Erro ao abrir caixa.'
            });
        }
    },

    async createMovement(req, res) {
        try {
            const cashRegister = await getOpenCashRegister();

            if (!cashRegister) {
                return res.status(400).json({
                    success: false,
                    error: 'Abra o caixa antes de registrar movimentações.'
                });
            }

            const type = req.body.type || req.body.tipo || 'entrada';
            const description = req.body.description || req.body.descricao || 'Movimentação de caixa';
            const amount = toNumber(req.body.amount ?? req.body.value ?? req.body.valor, 0);
            const paymentMethod = req.body.payment_method || req.body.paymentMethod || 'dinheiro';
            const referenceType = req.body.reference_type || req.body.referenceType || null;
            const referenceId = req.body.reference_id || req.body.referenceId || null;

            if (!['entrada', 'saida'].includes(type)) {
                return res.status(400).json({
                    success: false,
                    error: 'Tipo de movimentação inválido.'
                });
            }

            if (amount <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'O valor da movimentação deve ser maior que zero.'
                });
            }

            const { data, error } = await supabase
                .from('cash_movements')
                .insert({
                    cash_register_id: cashRegister.id,
                    type,
                    description,
                    amount,
                    payment_method: paymentMethod,
                    reference_type: referenceType,
                    reference_id: referenceId
                })
                .select()
                .single();

            if (error) throw error;

            return res.status(201).json({
                success: true,
                data,
                message: 'Movimentação registrada com sucesso.'
            });

        } catch (error) {
            console.error('Erro ao criar movimentação do caixa:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Erro ao criar movimentação do caixa.'
            });
        }
    },

    async close(req, res) {
        try {
            const cashRegister = await getOpenCashRegister();

            if (!cashRegister) {
                return res.status(400).json({
                    success: false,
                    error: 'Não existe caixa aberto para fechar.'
                });
            }

            const balanceData = await calculateCashBalance(cashRegister.id, cashRegister.opening_balance);
            const closingBalance = toNumber(req.body.closing_balance ?? req.body.closingBalance ?? balanceData.balance);
            const notes = req.body.notes || cashRegister.notes || '';

            const { data, error } = await supabase
                .from('cash_registers')
                .update({
                    closing_balance: closingBalance,
                    status: 'fechado',
                    closed_at: new Date().toISOString(),
                    notes,
                    updated_at: new Date().toISOString()
                })
                .eq('id', cashRegister.id)
                .select()
                .single();

            if (error) throw error;

            return res.status(200).json({
                success: true,
                data: {
                    ...data,
                    calculated_balance: balanceData.balance,
                    total_entries: balanceData.totalEntries,
                    total_exits: balanceData.totalExits
                },
                message: 'Caixa fechado com sucesso.'
            });

        } catch (error) {
            console.error('Erro ao fechar caixa:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Erro ao fechar caixa.'
            });
        }
    },

    async deleteMovement(req, res) {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: 'ID da movimentação não informado.'
                });
            }

            const { data, error } = await supabase
                .from('cash_movements')
                .delete()
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            return res.status(200).json({
                success: true,
                data,
                message: 'Movimentação excluída com sucesso.'
            });

        } catch (error) {
            console.error('Erro ao excluir movimentação do caixa:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Erro ao excluir movimentação do caixa.'
            });
        }
    }
};

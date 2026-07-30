import { supabase } from '../config/supabaseClient.js';

function toNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function normalizeExpense(row = {}) {
    return {
        ...row,
        amount: toNumber(row.amount ?? row.value ?? row.valor, 0),
        value: toNumber(row.amount ?? row.value ?? row.valor, 0),
        paid: Boolean(row.paid),
        status: row.status || (row.paid ? 'pago' : 'pendente'),
        reference_type: row.reference_type || row.referenceType || null,
        reference_id: row.reference_id || row.referenceId || null
    };
}

export const expenseController = {

    async getAll(req, res) {
        try {
            const { data, error } = await supabase
                .from('expenses')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            return res.json({
                success: true,
                data: (data || []).map(normalizeExpense)
            });

        } catch (error) {
            console.error('Erro ao listar despesas:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Erro ao listar despesas.'
            });
        }
    },

    async create(req, res) {
        try {
            const expense = req.body || {};
            const amount = toNumber(expense.amount ?? expense.value ?? expense.valor, 0);
            const paid = Boolean(expense.paid ?? expense.pago ?? false);

            if (amount <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'O valor da despesa deve ser maior que zero.'
                });
            }

            const { data, error } = await supabase
                .from('expenses')
                .insert([{
                    description: expense.description || expense.descricao || '',
                    category: expense.category || expense.categoria || 'Geral',
                    amount,
                    payment_method: expense.payment_method || expense.paymentMethod || 'dinheiro',
                    due_date: expense.due_date || expense.dueDate || null,
                    paid,
                    status: expense.status || (paid ? 'pago' : 'pendente'),
                    reference_type: expense.reference_type || expense.referenceType || null,
                    reference_id: expense.reference_id || expense.referenceId || null,
                    notes: expense.notes || '',
                    updated_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) throw error;

            return res.status(201).json({
                success: true,
                data: normalizeExpense(data)
            });

        } catch (error) {
            console.error('Erro ao cadastrar despesa:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Erro ao cadastrar despesa.'
            });
        }
    },

    async delete(req, res) {
        try {
            const { id } = req.params;

            const { data, error } = await supabase
                .from('expenses')
                .delete()
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            return res.json({
                success: true,
                data: normalizeExpense(data)
            });

        } catch (error) {
            console.error('Erro ao excluir despesa:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Erro ao excluir despesa.'
            });
        }
    }
};

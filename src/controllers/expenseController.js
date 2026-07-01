import { supabase } from '../config/supabaseClient.js';

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
                data: data || []
            });

        } catch (error) {
            console.error('Erro ao listar despesas:', error);

            return res.status(500).json({
                success: false,
                error: 'Erro ao listar despesas.'
            });
        }
    },

    async create(req, res) {
        try {
            const expense = req.body || {};

            const { data, error } = await supabase
                .from('expenses')
                .insert([{
                    description: expense.description || expense.descricao || '',
                    category: expense.category || expense.categoria || null,
                    amount: Number(expense.amount ?? expense.value ?? expense.valor ?? 0) || 0,
                    payment_method: expense.payment_method || expense.paymentMethod || 'dinheiro',
                    due_date: expense.due_date || expense.dueDate || null,
                    paid: Boolean(expense.paid || expense.pago || false),
                    notes: expense.notes || ''
                }])
                .select()
                .single();

            if (error) throw error;

            return res.status(201).json({
                success: true,
                data
            });

        } catch (error) {
            console.error('Erro ao cadastrar despesa:', error);

            return res.status(500).json({
                success: false,
                error: 'Erro ao cadastrar despesa.'
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
                data
            });

        } catch (error) {
            console.error('Erro ao excluir despesa:', error);

            return res.status(500).json({
                success: false,
                error: 'Erro ao excluir despesa.'
            });
        }
    }

};
import { supabase } from '../config/supabaseClient.js';

export const purchaseController = {

    async getAll(req, res) {
        try {
            const { data, error } = await supabase
                .from('purchases')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            return res.json({
                success: true,
                data: data || []
            });

        } catch (error) {
            console.error('Erro ao listar compras:', error);

            return res.status(500).json({
                success: false,
                error: 'Erro ao listar compras.'
            });
        }
    },

    async create(req, res) {
        try {
            const purchase = req.body || {};

            const { data, error } = await supabase
                .from('purchases')
                .insert([{
                    supplier_id: purchase.supplier_id || purchase.supplierId || null,
                    items: Array.isArray(purchase.items) ? purchase.items : [],
                    total_amount: Number(purchase.total_amount ?? purchase.total ?? 0) || 0,
                    notes: purchase.notes || ''
                }])
                .select()
                .single();

            if (error) throw error;

            return res.status(201).json({
                success: true,
                data
            });

        } catch (error) {
            console.error('Erro ao cadastrar compra:', error);

            return res.status(500).json({
                success: false,
                error: 'Erro ao cadastrar compra.'
            });
        }
    },

    async delete(req, res) {
        try {
            const { id } = req.params;

            const { data, error } = await supabase
                .from('purchases')
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
            console.error('Erro ao excluir compra:', error);

            return res.status(500).json({
                success: false,
                error: 'Erro ao excluir compra.'
            });
        }
    }

};
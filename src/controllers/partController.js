import { supabase } from '../config/supabaseClient.js';

export const partController = {

    // ==========================
    // LISTAR TODAS AS PEÇAS
    // ==========================
    async getAll(req, res) {
        try {
            const { data, error } = await supabase
                .from('parts')
                .select(`
                    id,
                    name,
                    code,
                    quantity,
                    cost_price,
                    sale_price,
                    supplier_id,
                    min_stock,
                    created_at,
                    updated_at
                `)
                .order('name', { ascending: true });

            if (error) throw error;

            return res.status(200).json({
                success: true,
                data
            });

        } catch (error) {
            console.error('Erro ao buscar peças:', error);

            return res.status(500).json({
                success: false,
                error: 'Erro ao buscar peças.'
            });
        }
    },

    // ==========================
    // BUSCAR PEÇA POR ID
    // ==========================
    async getById(req, res) {
        try {
            const { id } = req.params;

            const { data, error } = await supabase
                .from('parts')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            return res.status(200).json({
                success: true,
                data
            });

        } catch (error) {
            console.error('Erro ao buscar peça:', error);

            return res.status(404).json({
                success: false,
                error: 'Peça não encontrada.'
            });
        }
    },

    // ==========================
    // CADASTRAR PEÇA
    // ==========================
    async create(req, res) {
        try {
            const part = { ...req.body };

            delete part.id;
            delete part.created_at;
            delete part.updated_at;

            const { data, error } = await supabase
                .from('parts')
                .insert([{
                    name: part.name,
                    code: part.code || null,
                    quantity: Number(part.quantity) || 0,
                    cost_price: Number(part.cost_price) || 0,
                    sale_price: Number(part.sale_price) || 0,
                    supplier_id: part.supplier_id || null,
                    min_stock: Number(part.min_stock) || 0
                }])
                .select()
                .single();

            if (error) throw error;

            return res.status(201).json({
                success: true,
                data
            });

        } catch (error) {
            console.error('Erro ao cadastrar peça:', error);

            return res.status(500).json({
                success: false,
                error: 'Erro ao cadastrar peça.'
            });
        }
    },

    // ==========================
    // ATUALIZAR PEÇA
    // ==========================
    async update(req, res) {
        try {
            const { id } = req.params;
            const part = { ...req.body };

            delete part.id;
            delete part.created_at;

            const { data, error } = await supabase
                .from('parts')
                .update({
                    name: part.name,
                    code: part.code || null,
                    quantity: Number(part.quantity) || 0,
                    cost_price: Number(part.cost_price) || 0,
                    sale_price: Number(part.sale_price) || 0,
                    supplier_id: part.supplier_id || null,
                    min_stock: Number(part.min_stock) || 0,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            return res.status(200).json({
                success: true,
                data
            });

        } catch (error) {
            console.error('Erro ao atualizar peça:', error);

            return res.status(500).json({
                success: false,
                error: 'Erro ao atualizar peça.'
            });
        }
    },

    // ==========================
    // EXCLUIR PEÇA
    // ==========================
    async delete(req, res) {
        try {
            const { id } = req.params;

            const { data, error } = await supabase
                .from('parts')
                .delete()
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            return res.status(200).json({
                success: true,
                data
            });

        } catch (error) {
            console.error('Erro ao excluir peça:', error);

            return res.status(500).json({
                success: false,
                error: 'Erro ao excluir peça.'
            });
        }
    }
};
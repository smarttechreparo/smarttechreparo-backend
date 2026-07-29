import { supabase } from '../config/supabaseClient.js';

function normalizePartPayload(body = {}) {
    return {
        name: body.name || '',
        code: body.code || null,
        category: body.category || body.categoria || '',
        description: body.description || body.descricao || '',
        ncm: body.ncm || '',
        cfop: body.cfop || '',
        quantity: Number(body.quantity ?? body.quantidade ?? 0) || 0,
        cost_price: Number(body.cost_price ?? body.costPrice ?? body.custo ?? 0) || 0,
        sale_price: Number(body.sale_price ?? body.salePrice ?? body.preco ?? 0) || 0,
        supplier_id: body.supplier_id || body.supplierId || null,
        min_stock: Number(body.min_stock ?? body.minStock ?? body.estoque_minimo ?? 0) || 0
    };
}

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
                    category,
                    description,
                    ncm,
                    cfop,
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
                data: data || []
            });

        } catch (error) {
            console.error('Erro ao buscar peças:', error);

            return res.status(500).json({
                success: false,
                error: error.message || 'Erro ao buscar peças.'
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
                .select(`
                    id,
                    name,
                    code,
                    category,
                    description,
                    ncm,
                    cfop,
                    quantity,
                    cost_price,
                    sale_price,
                    supplier_id,
                    min_stock,
                    created_at,
                    updated_at
                `)
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
                error: error.message || 'Peça não encontrada.'
            });
        }
    },

    // ==========================
    // CADASTRAR PEÇA
    // ==========================
    async create(req, res) {
        try {
            const payload = normalizePartPayload(req.body);

            if (!payload.name) {
                return res.status(400).json({
                    success: false,
                    error: 'Informe o nome da peça.'
                });
            }

            const { data, error } = await supabase
                .from('parts')
                .insert([payload])
                .select(`
                    id,
                    name,
                    code,
                    category,
                    description,
                    ncm,
                    cfop,
                    quantity,
                    cost_price,
                    sale_price,
                    supplier_id,
                    min_stock,
                    created_at,
                    updated_at
                `)
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
                error: error.message || 'Erro ao cadastrar peça.'
            });
        }
    },

    // ==========================
    // ATUALIZAR PEÇA
    // ==========================
    async update(req, res) {
        try {
            const { id } = req.params;

            const payload = {
                ...normalizePartPayload(req.body),
                updated_at: new Date().toISOString()
            };

            if (!payload.name) {
                return res.status(400).json({
                    success: false,
                    error: 'Informe o nome da peça.'
                });
            }

            const { data, error } = await supabase
                .from('parts')
                .update(payload)
                .eq('id', id)
                .select(`
                    id,
                    name,
                    code,
                    category,
                    description,
                    ncm,
                    cfop,
                    quantity,
                    cost_price,
                    sale_price,
                    supplier_id,
                    min_stock,
                    created_at,
                    updated_at
                `)
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
                error: error.message || 'Erro ao atualizar peça.'
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
                error: error.message || 'Erro ao excluir peça.'
            });
        }
    }
};

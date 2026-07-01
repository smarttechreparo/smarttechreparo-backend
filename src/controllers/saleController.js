import { supabase } from '../config/supabaseClient.js';

function normalizeSalePayload(payload = {}) {
    const items = Array.isArray(payload.items)
        ? payload.items
        : [];

    const discountAmount = Number(payload.discount_amount ?? payload.discount ?? 0) || 0;

    const calculatedTotal = items.reduce((sum, item) => {
        const quantity = Number(item.quantity) || 1;
        const price = Number(item.price || item.sale_price || item.unit_price || 0) || 0;
        const subtotal = Number(item.subtotal) || quantity * price;

        return sum + subtotal;
    }, 0);

    const totalAmount = Number(payload.total_amount ?? payload.total ?? calculatedTotal) || calculatedTotal;

    return {
        client_id: payload.client_id || payload.clientId || null,
        items,
        total_amount: totalAmount,
        discount_amount: discountAmount,
        payment_method: payload.payment_method || payload.paymentMethod || 'dinheiro',
        status: payload.status || 'concluida'
    };
}

export const saleController = {

    // ==========================
    // LISTAR TODAS AS VENDAS
    // ==========================
    async getAll(req, res) {
        try {
            const { data, error } = await supabase
                .from('sales')
                .select(`
                    id,
                    client_id,
                    items,
                    total_amount,
                    discount_amount,
                    payment_method,
                    status,
                    created_at,
                    updated_at
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return res.status(200).json({
                success: true,
                data
            });

        } catch (error) {
            console.error('Erro ao buscar vendas:', error);

            return res.status(500).json({
                success: false,
                error: 'Erro ao buscar vendas.'
            });
        }
    },

    // ==========================
    // BUSCAR VENDA POR ID
    // ==========================
    async getById(req, res) {
        try {
            const { id } = req.params;

            const { data, error } = await supabase
                .from('sales')
                .select(`
                    id,
                    client_id,
                    items,
                    total_amount,
                    discount_amount,
                    payment_method,
                    status,
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
            console.error('Erro ao buscar venda:', error);

            return res.status(404).json({
                success: false,
                error: 'Venda não encontrada.'
            });
        }
    },

    // ==========================
    // CADASTRAR VENDA
    // ==========================
    async create(req, res) {
        try {
            const sale = normalizeSalePayload(req.body);

            const { data, error } = await supabase
                .from('sales')
                .insert([sale])
                .select()
                .single();

            if (error) throw error;

            return res.status(201).json({
                success: true,
                data
            });

        } catch (error) {
            console.error('Erro ao cadastrar venda:', error);

            return res.status(500).json({
                success: false,
                error: 'Erro ao cadastrar venda.'
            });
        }
    },

    // ==========================
    // ATUALIZAR VENDA
    // ==========================
    async update(req, res) {
        try {
            const { id } = req.params;

            const sale = normalizeSalePayload(req.body);

            const { data, error } = await supabase
                .from('sales')
                .update({
                    ...sale,
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
            console.error('Erro ao atualizar venda:', error);

            return res.status(500).json({
                success: false,
                error: 'Erro ao atualizar venda.'
            });
        }
    },

    // ==========================
    // EXCLUIR VENDA
    // ==========================
    async delete(req, res) {
        try {
            const { id } = req.params;

            const { data, error } = await supabase
                .from('sales')
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
            console.error('Erro ao excluir venda:', error);

            return res.status(500).json({
                success: false,
                error: 'Erro ao excluir venda.'
            });
        }
    }
};
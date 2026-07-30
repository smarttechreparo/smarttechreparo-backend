import { supabase } from '../config/supabaseClient.js';

function toNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function normalizeSalePayload(payload = {}) {
    const items = Array.isArray(payload.items) ? payload.items : [];
    const discountAmount = toNumber(payload.discount_amount ?? payload.discount, 0);

    const calculatedTotal = items.reduce((sum, item) => {
        const quantity = toNumber(item.quantity, 1);
        const price = toNumber(item.price ?? item.sale_price ?? item.unit_price ?? item.unitPrice, 0);
        const subtotal = toNumber(item.subtotal ?? item.total, quantity * price);
        return sum + subtotal;
    }, 0);

    const totalAmount = toNumber(payload.total_amount ?? payload.total, calculatedTotal);

    return {
        client_id: payload.client_id || payload.clientId || null,
        items,
        total_amount: totalAmount,
        discount_amount: discountAmount,
        payment_method: payload.payment_method || payload.paymentMethod || 'dinheiro',
        status: payload.status || 'concluida'
    };
}

function getPartIdFromItem(item = {}) {
    return item.part_id || item.partId || item.id || null;
}

function getQuantityFromItem(item = {}) {
    return toNumber(item.quantity ?? item.qty ?? item.quantidade, 1);
}

async function applyStockMovementForSaleItems(items = [], direction = 'saida') {
    if (!Array.isArray(items) || items.length === 0) return;

    for (const item of items) {
        const partId = getPartIdFromItem(item);
        const quantity = getQuantityFromItem(item);

        if (!partId || quantity <= 0) continue;

        const { data: part, error: findError } = await supabase
            .from('parts')
            .select('id, name, quantity')
            .eq('id', partId)
            .single();

        if (findError) throw findError;

        const currentQuantity = toNumber(part.quantity, 0);
        let newQuantity;

        if (direction === 'saida') {
            if (currentQuantity < quantity) {
                throw new Error(`Estoque insuficiente para ${part.name}. Disponível: ${currentQuantity}, solicitado: ${quantity}.`);
            }
            newQuantity = currentQuantity - quantity;
        } else {
            newQuantity = currentQuantity + quantity;
        }

        const { error: updateError } = await supabase
            .from('parts')
            .update({
                quantity: newQuantity,
                updated_at: new Date().toISOString()
            })
            .eq('id', partId);

        if (updateError) throw updateError;
    }
}

async function getOpenCashRegister() {
    const { data, error } = await supabase
        .from('cash_registers')
        .select('id')
        .eq('status', 'aberto')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    return data;
}

function saleIsPaid(sale = {}) {
    const status = String(sale.status || '').toLowerCase();
    return ['concluida', 'paga', 'pago', 'finalizada', 'finalizado'].includes(status);
}

async function createCashMovementForSale(sale = {}) {
    if (!saleIsPaid(sale)) return null;

    const cashRegister = await getOpenCashRegister();
    if (!cashRegister) return null;

    const { data, error } = await supabase
        .from('cash_movements')
        .insert({
            cash_register_id: cashRegister.id,
            type: 'entrada',
            description: `Venda registrada${sale.id ? ` #${String(sale.id).slice(0, 8)}` : ''}`,
            amount: toNumber(sale.total_amount, 0),
            payment_method: sale.payment_method || 'dinheiro',
            reference_type: 'sale',
            reference_id: sale.id || null
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

async function deleteCashMovementsBySaleId(saleId) {
    if (!saleId) return;

    const { error } = await supabase
        .from('cash_movements')
        .delete()
        .eq('reference_type', 'sale')
        .eq('reference_id', saleId);

    if (error) throw error;
}

export const saleController = {

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
                data: data || []
            });

        } catch (error) {
            console.error('Erro ao buscar vendas:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Erro ao buscar vendas.'
            });
        }
    },

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

            return res.status(200).json({ success: true, data });

        } catch (error) {
            console.error('Erro ao buscar venda:', error);
            return res.status(404).json({
                success: false,
                error: error.message || 'Venda não encontrada.'
            });
        }
    },

    async create(req, res) {
        try {
            const sale = normalizeSalePayload(req.body);

            await applyStockMovementForSaleItems(sale.items, 'saida');

            const { data, error } = await supabase
                .from('sales')
                .insert([sale])
                .select()
                .single();

            if (error) {
                await applyStockMovementForSaleItems(sale.items, 'entrada');
                throw error;
            }

            let cashMovement = null;
            try {
                cashMovement = await createCashMovementForSale(data);
            } catch (cashError) {
                console.error('Venda salva, mas erro ao lançar no caixa:', cashError);
            }

            return res.status(201).json({
                success: true,
                data: {
                    ...data,
                    cashMovement
                }
            });

        } catch (error) {
            console.error('Erro ao cadastrar venda:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Erro ao cadastrar venda.'
            });
        }
    },

    async update(req, res) {
        try {
            const { id } = req.params;
            const sale = normalizeSalePayload(req.body);

            const { data: oldSale, error: oldError } = await supabase
                .from('sales')
                .select('id, items')
                .eq('id', id)
                .single();

            if (oldError) throw oldError;

            await applyStockMovementForSaleItems(oldSale.items || [], 'entrada');
            await applyStockMovementForSaleItems(sale.items, 'saida');

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

            await deleteCashMovementsBySaleId(id);

            let cashMovement = null;
            try {
                cashMovement = await createCashMovementForSale(data);
            } catch (cashError) {
                console.error('Venda atualizada, mas erro ao relançar no caixa:', cashError);
            }

            return res.status(200).json({
                success: true,
                data: {
                    ...data,
                    cashMovement
                }
            });

        } catch (error) {
            console.error('Erro ao atualizar venda:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Erro ao atualizar venda.'
            });
        }
    },

    async delete(req, res) {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                error: 'ID da venda não informado.'
            });
        }

        // 1. Busca a venda antes de excluir
        const { data: sale, error: saleError } = await supabase
            .from('sales')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (saleError) throw saleError;

        if (!sale) {
            return res.status(404).json({
                success: false,
                error: 'Venda não encontrada.'
            });
        }

        const items = Array.isArray(sale.items) ? sale.items : [];

        // 2. Devolve estoque das peças
        for (const item of items) {
            const partId = item.part_id || item.partId || null;
            const quantity = Number(item.quantity || item.qty || 0) || 0;

            if (!partId || quantity <= 0) continue;

            const { data: part, error: partError } = await supabase
                .from('parts')
                .select('id, quantity')
                .eq('id', partId)
                .maybeSingle();

            if (partError) throw partError;
            if (!part) continue;

            const newQuantity = (Number(part.quantity) || 0) + quantity;

            const { error: updatePartError } = await supabase
                .from('parts')
                .update({
                    quantity: newQuantity,
                    updated_at: new Date().toISOString()
                })
                .eq('id', partId);

            if (updatePartError) throw updatePartError;
        }

        // 3. Remove movimentações do caixa vinculadas à venda
        // NÃO usar .single() aqui, porque pode existir 0 ou mais lançamentos.
        const { error: cashDeleteError } = await supabase
            .from('cash_movements')
            .delete()
            .eq('reference_type', 'sale')
            .eq('reference_id', id);

        if (cashDeleteError) throw cashDeleteError;

        // 4. Exclui a venda
        // Usar maybeSingle para evitar erro se o Supabase não retornar exatamente 1 objeto.
        const { data: deletedSale, error: deleteError } = await supabase
            .from('sales')
            .delete()
            .eq('id', id)
            .select()
            .maybeSingle();

        if (deleteError) throw deleteError;

        return res.status(200).json({
            success: true,
            data: deletedSale || sale,
            message: 'Venda excluída, estoque devolvido e caixa ajustado.'
        });

    } catch (error) {
        console.error('Erro ao excluir venda:', error);

        return res.status(500).json({
            success: false,
            error: error.message || 'Erro ao excluir venda.'
        });
    }
}

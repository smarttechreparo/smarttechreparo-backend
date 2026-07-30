import { supabase } from '../config/supabaseClient.js';

// ==========================
// HELPERS
// ==========================

function toNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function normalizeSalePayload(payload = {}) {
    const items = Array.isArray(payload.items) ? payload.items : [];

    const discountAmount = toNumber(
        payload.discount_amount ?? payload.discount ?? 0,
        0
    );

    const calculatedTotal = items.reduce((sum, item) => {
        const quantity = toNumber(item.quantity ?? item.qty ?? 1, 1);
        const price = toNumber(
            item.price ??
            item.sale_price ??
            item.salePrice ??
            item.unit_price ??
            item.unitPrice ??
            0,
            0
        );

        const subtotal = toNumber(item.subtotal, quantity * price);

        return sum + subtotal;
    }, 0);

    const totalAmount = toNumber(
        payload.total_amount ?? payload.total ?? calculatedTotal,
        calculatedTotal
    );

    return {
        client_id: payload.client_id || payload.clientId || null,
        items,
        total_amount: totalAmount,
        discount_amount: discountAmount,
        payment_method: payload.payment_method || payload.paymentMethod || 'dinheiro',
        status: payload.status || 'concluida'
    };
}

function normalizeSale(row) {
    if (!row) return null;

    return {
        ...row,

        clientId: row.client_id || row.clientId || null,
        client_id: row.client_id || row.clientId || null,

        total: toNumber(row.total_amount ?? row.total, 0),
        total_amount: toNumber(row.total_amount ?? row.total, 0),

        discount: toNumber(row.discount_amount ?? row.discount, 0),
        discount_amount: toNumber(row.discount_amount ?? row.discount, 0),

        paymentMethod: row.payment_method || row.paymentMethod || 'dinheiro',
        payment_method: row.payment_method || row.paymentMethod || 'dinheiro',

        items: Array.isArray(row.items) ? row.items : []
    };
}

function getItemPartId(item = {}) {
    return (
        item.part_id ||
        item.partId ||
        item.product_id ||
        item.productId ||
        null
    );
}

function getItemQuantity(item = {}) {
    return toNumber(item.quantity ?? item.qty ?? 0, 0);
}

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

async function decreaseStockFromSaleItems(items = []) {
    if (!Array.isArray(items) || items.length === 0) return;

    for (const item of items) {
        const partId = getItemPartId(item);
        const quantityToRemove = getItemQuantity(item);

        if (!partId || quantityToRemove <= 0) {
            continue;
        }

        const { data: part, error: partError } = await supabase
            .from('parts')
            .select('id, name, quantity')
            .eq('id', partId)
            .maybeSingle();

        if (partError) throw partError;

        if (!part) {
            console.warn('Peça não encontrada ao baixar estoque:', partId);
            continue;
        }

        const currentQuantity = toNumber(part.quantity, 0);

        if (currentQuantity < quantityToRemove) {
            throw new Error(
                `Estoque insuficiente para ${part.name || 'peça'}. Disponível: ${currentQuantity}, solicitado: ${quantityToRemove}.`
            );
        }

        const newQuantity = currentQuantity - quantityToRemove;

        const { error: updateError } = await supabase
            .from('parts')
            .update({
                quantity: newQuantity,
                updated_at: new Date().toISOString()
            })
            .eq('id', partId);

        if (updateError) throw updateError;

        console.log('📦 Estoque baixado pela venda:', {
            partId,
            partName: part.name,
            antes: currentQuantity,
            removeu: quantityToRemove,
            depois: newQuantity
        });
    }
}

async function restoreStockFromSaleItems(items = []) {
    if (!Array.isArray(items) || items.length === 0) return;

    for (const item of items) {
        const partId = getItemPartId(item);
        const quantityToRestore = getItemQuantity(item);

        if (!partId || quantityToRestore <= 0) {
            continue;
        }

        const { data: part, error: partError } = await supabase
            .from('parts')
            .select('id, name, quantity')
            .eq('id', partId)
            .maybeSingle();

        if (partError) throw partError;

        if (!part) {
            console.warn('Peça não encontrada ao devolver estoque:', partId);
            continue;
        }

        const currentQuantity = toNumber(part.quantity, 0);
        const newQuantity = currentQuantity + quantityToRestore;

        const { error: updateError } = await supabase
            .from('parts')
            .update({
                quantity: newQuantity,
                updated_at: new Date().toISOString()
            })
            .eq('id', partId);

        if (updateError) throw updateError;

        console.log('📦 Estoque devolvido pela exclusão da venda:', {
            partId,
            partName: part.name,
            antes: currentQuantity,
            devolveu: quantityToRestore,
            depois: newQuantity
        });
    }
}

async function createCashMovementFromSale(sale) {
    if (!sale) return null;

    const status = sale.status || 'concluida';

    if (status === 'cancelada') {
        return null;
    }

    const cashRegister = await getOpenCashRegister();

    if (!cashRegister) {
        console.log('ℹ️ Venda criada sem caixa aberto. Não foi gerada movimentação.');
        return null;
    }

    const amount = toNumber(sale.total_amount ?? sale.total, 0);

    if (amount <= 0) {
        return null;
    }

    // Evita duplicar lançamento no caixa para a mesma venda
    const { data: existingMovement, error: existingError } = await supabase
        .from('cash_movements')
        .select('id')
        .eq('reference_type', 'sale')
        .eq('reference_id', sale.id)
        .limit(1)
        .maybeSingle();

    if (existingError) throw existingError;

    if (existingMovement) {
        return existingMovement;
    }

    const { data, error } = await supabase
        .from('cash_movements')
        .insert({
            cash_register_id: cashRegister.id,
            type: 'entrada',
            description: `Venda ${sale.id}`,
            amount,
            payment_method: sale.payment_method || 'dinheiro',
            reference_type: 'sale',
            reference_id: sale.id
        })
        .select()
        .maybeSingle();

    if (error) throw error;

    return data;
}

async function deleteCashMovementsFromSale(saleId) {
    if (!saleId) return;

    // Não usar .single() aqui.
    // Pode existir 0 ou mais movimentações vinculadas à venda.
    const { error } = await supabase
        .from('cash_movements')
        .delete()
        .eq('reference_type', 'sale')
        .eq('reference_id', saleId);

    if (error) throw error;
}

// ==========================
// CONTROLLER
// ==========================

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
                data: (data || []).map(normalizeSale)
            });

        } catch (error) {
            console.error('Erro ao buscar vendas:', error);

            return res.status(500).json({
                success: false,
                error: error.message || 'Erro ao buscar vendas.'
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
                .maybeSingle();

            if (error) throw error;

            if (!data) {
                return res.status(404).json({
                    success: false,
                    error: 'Venda não encontrada.'
                });
            }

            return res.status(200).json({
                success: true,
                data: normalizeSale(data)
            });

        } catch (error) {
            console.error('Erro ao buscar venda:', error);

            return res.status(500).json({
                success: false,
                error: error.message || 'Erro ao buscar venda.'
            });
        }
    },

    // ==========================
    // CADASTRAR VENDA
    // ==========================
    async create(req, res) {
        try {
            const sale = normalizeSalePayload(req.body);

            if (!Array.isArray(sale.items) || sale.items.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Adicione pelo menos um item na venda.'
                });
            }

            if (sale.total_amount <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'O valor total da venda deve ser maior que zero.'
                });
            }

            // 1. Baixa estoque antes de salvar a venda
            await decreaseStockFromSaleItems(sale.items);

            // 2. Salva venda
            const { data, error } = await supabase
                .from('sales')
                .insert([sale])
                .select()
                .maybeSingle();

            if (error) {
                // Tenta devolver estoque se a venda falhar depois da baixa
                await restoreStockFromSaleItems(sale.items).catch(restoreError => {
                    console.error('Erro ao restaurar estoque após falha na venda:', restoreError);
                });

                throw error;
            }

            // 3. Lança entrada no caixa aberto
            await createCashMovementFromSale(data);

            return res.status(201).json({
                success: true,
                data: normalizeSale(data),
                message: 'Venda cadastrada, estoque baixado e caixa atualizado.'
            });

        } catch (error) {
            console.error('Erro ao cadastrar venda:', error);

            return res.status(500).json({
                success: false,
                error: error.message || 'Erro ao cadastrar venda.'
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
                .maybeSingle();

            if (error) throw error;

            if (!data) {
                return res.status(404).json({
                    success: false,
                    error: 'Venda não encontrada para atualizar.'
                });
            }

            return res.status(200).json({
                success: true,
                data: normalizeSale(data),
                message: 'Venda atualizada com sucesso.'
            });

        } catch (error) {
            console.error('Erro ao atualizar venda:', error);

            return res.status(500).json({
                success: false,
                error: error.message || 'Erro ao atualizar venda.'
            });
        }
    },

    // ==========================
    // EXCLUIR VENDA
    // ==========================
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
                    error: 'Venda não encontrada ou já excluída.'
                });
            }

            const items = Array.isArray(sale.items) ? sale.items : [];

            // 2. Devolve estoque
            await restoreStockFromSaleItems(items);

            // 3. Remove movimentações do caixa vinculadas à venda
            await deleteCashMovementsFromSale(id);

            // 4. Exclui a venda
            // Não usar .single() aqui para evitar:
            // "Cannot coerce the result to a single JSON object"
            const { error: deleteError } = await supabase
                .from('sales')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            return res.status(200).json({
                success: true,
                data: normalizeSale(sale),
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
};

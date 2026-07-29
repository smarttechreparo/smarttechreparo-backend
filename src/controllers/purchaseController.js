import { supabase } from '../config/supabaseClient.js';

function toNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function today() {
    return new Date().toISOString().split('T')[0];
}

async function createOrUpdatePartFromPurchaseItem(item, supplierId) {
    const partId = item.part_id || item.partId || null;
    const name = item.partName || item.name || item.description || '';
    const code = item.partCode || item.code || '';
    const quantity = toNumber(item.quantity, 1);
    const unitPrice = toNumber(item.unitPrice ?? item.price, 0);

    if (!name.trim()) {
        return null;
    }

    if (partId) {
        const { data: existingPart, error: findError } = await supabase
            .from('parts')
            .select('id, name, code, quantity')
            .eq('id', partId)
            .single();

        if (findError && findError.code !== 'PGRST116') {
            throw findError;
        }

        if (existingPart) {
            const newQuantity = toNumber(existingPart.quantity, 0) + quantity;

            const { data, error } = await supabase
                .from('parts')
                .update({
                    quantity: newQuantity,
                    cost_price: unitPrice,
                    sale_price: unitPrice,
                    supplier_id: supplierId || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', partId)
                .select()
                .single();

            if (error) throw error;

            return data;
        }
    }

    let existingQuery = supabase
        .from('parts')
        .select('id, name, code, quantity')
        .ilike('name', name.trim())
        .limit(1);

    if (code) {
        existingQuery = supabase
            .from('parts')
            .select('id, name, code, quantity')
            .eq('code', code)
            .limit(1);
    }

    const { data: existingParts, error: searchError } = await existingQuery;

    if (searchError) throw searchError;

    if (existingParts && existingParts.length > 0) {
        const existingPart = existingParts[0];
        const newQuantity = toNumber(existingPart.quantity, 0) + quantity;

        const { data, error } = await supabase
            .from('parts')
            .update({
                quantity: newQuantity,
                cost_price: unitPrice,
                sale_price: unitPrice,
                supplier_id: supplierId || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', existingPart.id)
            .select()
            .single();

        if (error) throw error;

        return data;
    }

    const { data, error } = await supabase
        .from('parts')
        .insert({
            name: name.trim(),
            code,
            quantity,
            min_stock: 5,
            cost_price: unitPrice,
            sale_price: unitPrice,
            supplier_id: supplierId || null
        })
        .select()
        .single();

    if (error) throw error;

    return data;
}

async function revertStockFromPurchaseItems(items = []) {
    if (!Array.isArray(items) || items.length === 0) {
        return;
    }

    for (const item of items) {
        const partId = item.part_id || item.partId || null;
        const quantityToRemove = toNumber(item.quantity, 0);

        if (!partId || quantityToRemove <= 0) {
            continue;
        }

        const { data: part, error: findError } = await supabase
            .from('parts')
            .select('id, name, quantity')
            .eq('id', partId)
            .single();

        if (findError) {
            console.warn('Peça não encontrada para reverter estoque:', {
                partId,
                error: findError.message
            });
            continue;
        }

        const currentQuantity = toNumber(part.quantity, 0);
        const newQuantity = Math.max(0, currentQuantity - quantityToRemove);

        const { error: updateError } = await supabase
            .from('parts')
            .update({
                quantity: newQuantity,
                updated_at: new Date().toISOString()
            })
            .eq('id', partId);

        if (updateError) throw updateError;

        console.log('📦 Estoque revertido pela exclusão da compra:', {
            partId,
            partName: part.name,
            antes: currentQuantity,
            removeu: quantityToRemove,
            depois: newQuantity
        });
    }
}

function normalizePurchase(row) {
    if (!row) return null;

    return {
        ...row,

        invoiceNumber: row.invoice_number || row.invoiceNumber || '',
        invoice_number: row.invoice_number || row.invoiceNumber || '',

        supplierId: row.supplier_id || row.supplierId || null,
        supplier_id: row.supplier_id || row.supplierId || null,

        supplierName: row.supplier_name || row.supplierName || '',
        supplier_name: row.supplier_name || row.supplierName || '',

        issueDate: row.issue_date || row.issueDate || row.created_at,
        issue_date: row.issue_date || row.issueDate || row.created_at,

        arrivalDate: row.arrival_date || row.arrivalDate || null,
        entryDate: row.entry_date || row.entryDate || null,

        paymentMethod: row.payment_method || row.paymentMethod || 'dinheiro',
        payment_method: row.payment_method || row.paymentMethod || 'dinheiro',

        productsTotal: toNumber(row.products_total ?? row.productsTotal, 0),
        products_total: toNumber(row.products_total ?? row.productsTotal, 0),

        otherExpenses: toNumber(row.other_expenses ?? row.otherExpenses, 0),
        other_expenses: toNumber(row.other_expenses ?? row.otherExpenses, 0),

        total: toNumber(row.total_amount ?? row.total, 0),
        total_amount: toNumber(row.total_amount ?? row.total, 0),

        items: Array.isArray(row.items) ? row.items : []
    };
}

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
                data: (data || []).map(normalizePurchase)
            });
        } catch (error) {
            console.error('Erro ao listar compras:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Erro ao listar compras.'
            });
        }
    },

    async create(req, res) {
        try {
            const body = req.body || {};

            const supplierId = body.supplier_id || body.supplierId || null;
            let supplierName = body.supplier_name || body.supplierName || '';

            if (supplierId && !supplierName) {
                const { data: supplier } = await supabase
                    .from('suppliers')
                    .select('name')
                    .eq('id', supplierId)
                    .single();

                supplierName = supplier?.name || '';
            }

            const rawItems = Array.isArray(body.items) ? body.items : [];
            const savedItems = [];

            for (const item of rawItems) {
                const part = await createOrUpdatePartFromPurchaseItem(item, supplierId);

                savedItems.push({
                    ...item,
                    part_id: part?.id || item.part_id || item.partId || null,
                    partId: part?.id || item.partId || item.part_id || null,
                    partName: item.partName || item.name || item.description || part?.name || '',
                    partCode: item.partCode || item.code || part?.code || '',
                    quantity: toNumber(item.quantity, 1),
                    unitPrice: toNumber(item.unitPrice ?? item.price, 0),
                    total: toNumber(
                        item.total,
                        toNumber(item.quantity, 1) * toNumber(item.unitPrice ?? item.price, 0)
                    ),
                    ncm: item.ncm || '',
                    cfop: item.cfop || body.cfop || '5405',
                    isBonus: !!item.isBonus
                });
            }

            const productsTotal = savedItems.reduce((sum, item) => {
                return sum + toNumber(item.total, 0);
            }, 0);

            const freight = toNumber(body.freight, 0);
            const insurance = toNumber(body.insurance, 0);
            const discount = toNumber(body.discount, 0);
            const otherExpenses = toNumber(body.other_expenses ?? body.otherExpenses, 0);

            const totalAmount = toNumber(
                body.total_amount ?? body.total,
                productsTotal + freight + insurance + otherExpenses - discount
            );

            const purchaseData = {
                supplier_id: supplierId,
                supplier_name: supplierName,

                invoice_number: body.invoice_number || body.invoiceNumber || '',
                series: body.series || '1',
                model: body.model || '55',

                issue_date: body.issue_date || body.issueDate || today(),
                arrival_date: body.arrival_date || body.arrivalDate || today(),
                entry_date: body.entry_date || body.entryDate || today(),

                cfop: body.cfop || '5405',
                freight,
                insurance,
                discount,
                other_expenses: otherExpenses,
                products_total: productsTotal,
                total_amount: totalAmount,

                payment_method: body.payment_method || body.paymentMethod || 'dinheiro',
                installments: toNumber(body.installments, 1),
                due_date: body.due_date || body.dueDate || today(),

                notes: body.notes || '',
                items: savedItems,
                status: body.status || 'pendente',
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('purchases')
                .insert(purchaseData)
                .select()
                .single();

            if (error) throw error;

            return res.status(201).json({
                success: true,
                data: normalizePurchase(data)
            });

        } catch (error) {
            console.error('Erro ao salvar compra:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Erro ao salvar compra.'
            });
        }
    },

    async delete(req, res) {
        try {
            const { id } = req.params;

            const { data: purchase, error: findError } = await supabase
                .from('purchases')
                .select('id, invoice_number, items')
                .eq('id', id)
                .single();

            if (findError) throw findError;

            const items = Array.isArray(purchase?.items) ? purchase.items : [];

            await revertStockFromPurchaseItems(items);

            const { data: deletedPurchase, error: deleteError } = await supabase
                .from('purchases')
                .delete()
                .eq('id', id)
                .select()
                .single();

            if (deleteError) throw deleteError;

            return res.json({
                success: true,
                data: normalizePurchase(deletedPurchase),
                message: 'Compra excluída e estoque revertido com sucesso.'
            });

        } catch (error) {
            console.error('Erro ao excluir compra:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Erro ao excluir compra.'
            });
        }
    }
};

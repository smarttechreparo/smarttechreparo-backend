import { supabase } from '../config/supabaseClient.js';

const SUPPLIER_COLUMNS = [
    'name',
    'contact',
    'phone',
    'email',
    'document',
    'category',
    'address',
    'city',
    'state',
    'notes'
];

function buildSupplierPayload(body) {
    return SUPPLIER_COLUMNS.reduce((payload, field) => {
        payload[field] = typeof body[field] === 'string'
            ? body[field].trim()
            : body[field] || '';

        return payload;
    }, {});
}

export const supplierController = {
    async getAll(req, res) {
        try {
            const { data, error } = await supabase
                .from('suppliers')
                .select(`
                    id,
                    name,
                    contact,
                    phone,
                    email,
                    document,
                    category,
                    address,
                    city,
                    state,
                    notes,
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
            console.error('Erro ao buscar fornecedores:', error);

            return res.status(500).json({
                success: false,
                error: 'Erro ao buscar fornecedores.'
            });
        }
    },

    async getById(req, res) {
        try {
            const { id } = req.params;

            const { data, error } = await supabase
                .from('suppliers')
                .select('*')
                .eq('id', id)
                .maybeSingle();

            if (error) throw error;

            if (!data) {
                return res.status(404).json({
                    success: false,
                    error: 'Fornecedor nao encontrado.'
                });
            }

            return res.status(200).json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Erro ao buscar fornecedor:', error);

            return res.status(500).json({
                success: false,
                error: 'Erro ao buscar fornecedor.'
            });
        }
    },

    async create(req, res) {
        try {
            const supplier = buildSupplierPayload(req.body);

            const { data, error } = await supabase
                .from('suppliers')
                .insert([supplier])
                .select()
                .single();

            if (error) throw error;

            return res.status(201).json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Erro ao cadastrar fornecedor:', error);

            return res.status(500).json({
                success: false,
                error: 'Erro ao cadastrar fornecedor.'
            });
        }
    },

    async update(req, res) {
        try {
            const { id } = req.params;
            const supplier = {
                ...buildSupplierPayload(req.body),
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('suppliers')
                .update(supplier)
                .eq('id', id)
                .select()
                .maybeSingle();

            if (error) throw error;

            if (!data) {
                return res.status(404).json({
                    success: false,
                    error: 'Fornecedor nao encontrado.'
                });
            }

            return res.status(200).json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Erro ao atualizar fornecedor:', error);

            return res.status(500).json({
                success: false,
                error: 'Erro ao atualizar fornecedor.'
            });
        }
    },

    async delete(req, res) {
        try {
            const { id } = req.params;

            const { data, error } = await supabase
                .from('suppliers')
                .delete()
                .eq('id', id)
                .select()
                .maybeSingle();

            if (error) throw error;

            if (!data) {
                return res.status(404).json({
                    success: false,
                    error: 'Fornecedor nao encontrado.'
                });
            }

            return res.status(200).json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Erro ao excluir fornecedor:', error);

            return res.status(500).json({
                success: false,
                error: 'Erro ao excluir fornecedor.'
            });
        }
    }
};

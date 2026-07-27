import { supabase } from '../config/supabaseClient.js';

const CLIENT_COLUMNS = [
    'name',
    'phone',
    'email',
    'document',
    'cep',
    'address',
    'number',
    'complement',
    'district',
    'city',
    'state'
];

function buildClientPayload(body) {
    return CLIENT_COLUMNS.reduce((payload, field) => {
        payload[field] = typeof body[field] === 'string'
            ? body[field].trim()
            : body[field] || '';

        return payload;
    }, {});
}

export const clientController = {
    async getAll(req, res) {
        try {
            const { data, error } = await supabase
                .from('clients')
                .select(`
                    id,
                    name,
                    phone,
                    email,
                    document,
                    cep,
                    address,
                    number,
                    complement,
                    district,
                    city,
                    state,
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
            console.error('Erro ao listar clientes:', error);

            return res.status(500).json({
                success: false,
                error: 'Erro ao listar clientes.'
            });
        }
    },

    async getById(req, res) {
        try {
            const { id } = req.params;

            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .eq('id', id)
                .maybeSingle();

            if (error) throw error;

            if (!data) {
                return res.status(404).json({
                    success: false,
                    error: 'Cliente nao encontrado.'
                });
            }

            return res.status(200).json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Erro ao buscar cliente:', error);

            return res.status(500).json({
                success: false,
                error: 'Erro ao buscar cliente.'
            });
        }
    },

    async create(req, res) {
        try {
            const client = buildClientPayload(req.body);

            const { data, error } = await supabase
                .from('clients')
                .insert([client])
                .select()
                .single();

            if (error) throw error;

            return res.status(201).json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Erro ao cadastrar cliente:', error);

            return res.status(500).json({
                success: false,
                error: 'Erro ao cadastrar cliente.'
            });
        }
    },

    async update(req, res) {
        try {
            const { id } = req.params;
            const client = {
                ...buildClientPayload(req.body),
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('clients')
                .update(client)
                .eq('id', id)
                .select()
                .maybeSingle();

            if (error) throw error;

            if (!data) {
                return res.status(404).json({
                    success: false,
                    error: 'Cliente nao encontrado.'
                });
            }

            return res.status(200).json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Erro ao atualizar cliente:', error);

            return res.status(500).json({
                success: false,
                error: 'Erro ao atualizar cliente.'
            });
        }
    },

    async delete(req, res) {
        try {
            const { id } = req.params;

            const { data, error } = await supabase
                .from('clients')
                .delete()
                .eq('id', id)
                .select()
                .maybeSingle();

            if (error) throw error;

            if (!data) {
                return res.status(404).json({
                    success: false,
                    error: 'Cliente nao encontrado.'
                });
            }

            return res.status(200).json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Erro ao excluir cliente:', error);

            return res.status(500).json({
                success: false,
                error: 'Erro ao excluir cliente.'
            });
        }
    }
};

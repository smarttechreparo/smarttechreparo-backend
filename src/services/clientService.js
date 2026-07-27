import { supabase } from '../config/supabaseClient.js';

export const clientService = {

    async getAll() {

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
            .order('name');

        if (error) throw error;

        return data;
    },

    async getById(id) {

        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        return data;
    },

    async create(client) {

        const { data, error } = await supabase
            .from('clients')
            .insert([client])
            .select()
            .single();

        if (error) throw error;

        return data;
    },

    async update(id, client) {

        const { data, error } = await supabase
            .from('clients')
            .update(client)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return data;
    },

    async delete(id) {

        const { data, error } = await supabase
            .from('clients')
            .delete()
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return data;
    }

};
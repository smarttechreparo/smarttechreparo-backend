import { supabase } from '../config/supabaseClient.js';

function normalizeService(service) {
    if (!service) return service;

    return {
        ...service,

        // Compatibilidade com o frontend antigo
        equipment: service.device_model || service.equipment || '',
        device_model: service.device_model || service.equipment || '',
        device_brand: service.device_brand || '',

        parts: Array.isArray(service.parts) ? service.parts : [],
        value: Number(service.value) || 0
    };
}

export const serviceController = {

    // ==========================
    // LISTAR TODOS OS SERVIÇOS
    // ==========================
    async getAll(req, res) {
        try {
            const { data, error } = await supabase
                .from('services')
                .select(`
                    id,
                    service_number,
                    client_id,
                    device_model,
                    device_brand,
                    problem,
                    solution,
                    value,
                    parts,
                    status,
                    notes,
                    created_at,
                    updated_at
                `)
                .order('service_number', { ascending: false });

            if (error) throw error;

            return res.status(200).json({
                success: true,
                data: (data || []).map(normalizeService)
            });

        } catch (error) {
            console.error('Erro ao buscar serviços:', error);

            return res.status(500).json({
                success: false,
                error: 'Erro ao buscar serviços.'
            });
        }
    },

    // ==========================
    // BUSCAR SERVIÇO POR ID
    // ==========================
    async getById(req, res) {
        try {
            const { id } = req.params;

            const { data, error } = await supabase
                .from('services')
                .select(`
                    id,
                    service_number,
                    client_id,
                    device_model,
                    device_brand,
                    problem,
                    solution,
                    value,
                    parts,
                    status,
                    notes,
                    created_at,
                    updated_at
                `)
                .eq('id', id)
                .single();

            if (error) throw error;

            return res.status(200).json({
                success: true,
                data: normalizeService(data)
            });

        } catch (error) {
            console.error('Erro ao buscar serviço:', error);

            return res.status(404).json({
                success: false,
                error: 'Serviço não encontrado.'
            });
        }
    },

    // ==========================
    // GERAR NÚMERO DO SERVIÇO
    // ==========================
    async getNextServiceNumber() {
        const { data, error } = await supabase
            .from('services')
            .select('service_number')
            .order('service_number', { ascending: false })
            .limit(1);

        if (error) throw error;

        const lastNumber = data?.[0]?.service_number || 0;

        return lastNumber + 1;
    },

    // ==========================
    // CADASTRAR SERVIÇO
    // ==========================
    async create(req, res) {
        try {
            const service = { ...req.body };

            delete service.id;
            delete service.created_at;
            delete service.updated_at;

            const nextServiceNumber = await serviceController.getNextServiceNumber();

            const deviceModel =
                service.device_model ||
                service.equipment ||
                '';

            const { data, error } = await supabase
                .from('services')
                .insert([{
                    service_number: nextServiceNumber,
                    client_id: service.client_id || service.clientId || null,
                    device_model: deviceModel,
                    device_brand: service.device_brand || service.brand || '',
                    problem: service.problem || '',
                    solution: service.solution || '',
                    value: Number(service.value) || 0,
                    parts: Array.isArray(service.parts) ? service.parts : [],
                    status: service.status || 'orcamento',
                    notes: service.notes || ''
                }])
                .select()
                .single();

            if (error) throw error;

            return res.status(201).json({
                success: true,
                data: normalizeService(data)
            });

        } catch (error) {
            console.error('Erro ao cadastrar serviço:', error);

            return res.status(500).json({
                success: false,
                error: 'Erro ao cadastrar serviço.'
            });
        }
    },

    // ==========================
    // ATUALIZAR SERVIÇO
    // ==========================
    async update(req, res) {
        try {
            const { id } = req.params;
            const service = { ...req.body };

            delete service.id;
            delete service.created_at;
            delete service.service_number;

            const deviceModel =
                service.device_model ||
                service.equipment ||
                '';

            const { data, error } = await supabase
                .from('services')
                .update({
                    client_id: service.client_id || service.clientId || null,
                    device_model: deviceModel,
                    device_brand: service.device_brand || service.brand || '',
                    problem: service.problem || '',
                    solution: service.solution || '',
                    value: Number(service.value) || 0,
                    parts: Array.isArray(service.parts) ? service.parts : [],
                    status: service.status || 'orcamento',
                    notes: service.notes || '',
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            return res.status(200).json({
                success: true,
                data: normalizeService(data)
            });

        } catch (error) {
            console.error('Erro ao atualizar serviço:', error);

            return res.status(500).json({
                success: false,
                error: 'Erro ao atualizar serviço.'
            });
        }
    },

    // ==========================
    // EXCLUIR SERVIÇO
    // ==========================
    async delete(req, res) {
        try {
            const { id } = req.params;

            const { data, error } = await supabase
                .from('services')
                .delete()
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            return res.status(200).json({
                success: true,
                data: normalizeService(data)
            });

        } catch (error) {
            console.error('Erro ao excluir serviço:', error);

            return res.status(500).json({
                success: false,
                error: 'Erro ao excluir serviço.'
            });
        }
    }
};
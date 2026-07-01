import { supabase } from '../config/supabaseClient.js';

const BUCKET_NAME = 'device-photos';

function parseItems(items) {
    if (!items) return {};

    if (typeof items === 'string') {
        try {
            return JSON.parse(items);
        } catch {
            return {};
        }
    }

    return items;
}

function makeSafeFileName(originalName = 'foto.jpg') {
    const extension = originalName.includes('.')
        ? originalName.split('.').pop()
        : 'jpg';

    return `${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${extension}`;
}

export const checklistController = {

    // ==========================
    // LISTAR CHECKLISTS
    // ==========================
    async getAll(req, res) {
        try {
            const { data, error } = await supabase
                .from('device_checklists')
                .select(`
                    id,
                    service_id,
                    type,
                    items,
                    observations,
                    technician_signature,
                    created_at,
                    updated_at,
                    checklist_photos (
                        id,
                        photo_url,
                        file_path,
                        created_at
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return res.status(200).json({
                success: true,
                data: data || []
            });

        } catch (error) {
            console.error('Erro ao listar checklists:', error);

            return res.status(500).json({
                success: false,
                error: 'Erro ao listar checklists.'
            });
        }
    },

    // ==========================
    // BUSCAR CHECKLIST POR ID
    // ==========================
    async getById(req, res) {
        try {
            const { id } = req.params;

            const { data, error } = await supabase
                .from('device_checklists')
                .select(`
                    id,
                    service_id,
                    type,
                    items,
                    observations,
                    technician_signature,
                    created_at,
                    updated_at,
                    checklist_photos (
                        id,
                        photo_url,
                        file_path,
                        created_at
                    )
                `)
                .eq('id', id)
                .single();

            if (error) throw error;

            return res.status(200).json({
                success: true,
                data
            });

        } catch (error) {
            console.error('Erro ao buscar checklist:', error);

            return res.status(404).json({
                success: false,
                error: 'Checklist não encontrado.'
            });
        }
    },

    // ==========================
    // LISTAR CHECKLISTS POR SERVIÇO
    // ==========================
    async getByService(req, res) {
        try {
            const { serviceId } = req.params;

            const { data, error } = await supabase
                .from('device_checklists')
                .select(`
                    id,
                    service_id,
                    type,
                    items,
                    observations,
                    technician_signature,
                    created_at,
                    updated_at,
                    checklist_photos (
                        id,
                        photo_url,
                        file_path,
                        created_at
                    )
                `)
                .eq('service_id', serviceId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return res.status(200).json({
                success: true,
                data: data || []
            });

        } catch (error) {
            console.error('Erro ao buscar checklists do serviço:', error);

            return res.status(500).json({
                success: false,
                error: 'Erro ao buscar checklists do serviço.'
            });
        }
    },

    // ==========================
    // CRIAR CHECKLIST COM FOTOS
    // ==========================
    async create(req, res) {
        try {
            const {
                serviceId,
                service_id,
                type,
                items,
                observations,
                technician_signature
            } = req.body;

            const files = req.files || [];

            const checklistPayload = {
                service_id: service_id || serviceId || null,
                type: type || 'entrada',
                items: parseItems(items),
                observations: observations || '',
                technician_signature: technician_signature || ''
            };

            const { data: checklist, error: checklistError } = await supabase
                .from('device_checklists')
                .insert([checklistPayload])
                .select()
                .single();

            if (checklistError) throw checklistError;

            const uploadedPhotos = [];

            for (const file of files) {
                const fileName = makeSafeFileName(file.originalname);
                const filePath = `${checklist.id}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from(BUCKET_NAME)
                    .upload(filePath, file.buffer, {
                        contentType: file.mimetype,
                        upsert: false
                    });

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage
                    .from(BUCKET_NAME)
                    .getPublicUrl(filePath);

                const { data: photoData, error: photoError } = await supabase
                    .from('checklist_photos')
                    .insert([{
                        checklist_id: checklist.id,
                        photo_url: publicUrlData.publicUrl,
                        file_path: filePath
                    }])
                    .select()
                    .single();

                if (photoError) throw photoError;

                uploadedPhotos.push(photoData);
            }

            return res.status(201).json({
                success: true,
                data: {
                    ...checklist,
                    photos: uploadedPhotos
                },
                checklistId: checklist.id,
                message: 'Checklist criado com sucesso.'
            });

        } catch (error) {
            console.error('Erro ao criar checklist:', error);

            return res.status(500).json({
                success: false,
                error: error.message || 'Erro ao criar checklist.'
            });
        }
    },

    // ==========================
    // EXCLUIR CHECKLIST
    // ==========================
    async delete(req, res) {
        try {
            const { id } = req.params;

            const { data: photos, error: photoListError } = await supabase
                .from('checklist_photos')
                .select('file_path')
                .eq('checklist_id', id);

            if (photoListError) throw photoListError;

            const filePaths = (photos || [])
                .map(photo => photo.file_path)
                .filter(Boolean);

            if (filePaths.length) {
                await supabase.storage
                    .from(BUCKET_NAME)
                    .remove(filePaths);
            }

            const { data, error } = await supabase
                .from('device_checklists')
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
            console.error('Erro ao excluir checklist:', error);

            return res.status(500).json({
                success: false,
                error: 'Erro ao excluir checklist.'
            });
        }
    }

};
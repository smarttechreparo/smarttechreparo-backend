import { supabase } from '../config/supabaseClient.js';

const BUCKET_NAME = 'device-photos';

function parseItems(value) {
    if (!value) return [];

    if (Array.isArray(value)) return value;

    try {
        return JSON.parse(value);
    } catch {
        return [];
    }
}

function makeSafeFileName(originalName = 'foto.jpg') {
    const ext = originalName.split('.').pop() || 'jpg';
    const name = originalName
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9-_]/g, '-')
        .toLowerCase();

    return `${Date.now()}-${name}.${ext}`;
}

export const checklistController = {
    async getAll(req, res) {
        try {
            const { data: checklists, error } = await supabase
                .from('device_checklists')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const ids = (checklists || []).map(item => item.id);

            let photos = [];

            if (ids.length > 0) {
                const { data: photosData, error: photosError } = await supabase
                    .from('checklist_photos')
                    .select('*')
                    .in('checklist_id', ids);

                if (!photosError) {
                    photos = photosData || [];
                }
            }

            const result = (checklists || []).map(checklist => ({
                ...checklist,
                photos: photos.filter(photo => photo.checklist_id === checklist.id)
            }));

            return res.json({
                success: true,
                data: result
            });

        } catch (error) {
            console.error('Erro ao listar checklists:', error);

            return res.status(500).json({
                success: false,
                error: error.message || 'Erro ao listar checklists.'
            });
        }
    },

    async getById(req, res) {
        try {
            const { id } = req.params;

            const { data: checklist, error } = await supabase
                .from('device_checklists')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            const { data: photos, error: photosError } = await supabase
                .from('checklist_photos')
                .select('*')
                .eq('checklist_id', id)
                .order('created_at', { ascending: false });

            if (photosError) {
                console.error('Erro ao buscar fotos do checklist:', photosError);
            }

            return res.json({
                success: true,
                data: {
                    ...checklist,
                    photos: photos || []
                }
            });

        } catch (error) {
            console.error('Erro ao buscar checklist:', error);

            return res.status(500).json({
                success: false,
                error: error.message || 'Erro ao buscar checklist.'
            });
        }
    },

    async getByService(req, res) {
        try {
            const { serviceId } = req.params;

            const { data, error } = await supabase
                .from('device_checklists')
                .select('*')
                .eq('service_id', serviceId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return res.json({
                success: true,
                data: data || []
            });

        } catch (error) {
            console.error('Erro ao listar checklists por serviço:', error);

            return res.status(500).json({
                success: false,
                error: error.message || 'Erro ao listar checklists por serviço.'
            });
        }
    },

    async create(req, res) {
        try {
            const serviceId = req.body.service_id;
            const type = req.body.type || 'entrada';
            const items = parseItems(req.body.items);
            const observations = req.body.observations || '';
            const technicianSignature = req.body.technician_signature || '';

            if (!serviceId) {
                return res.status(400).json({
                    success: false,
                    error: 'O serviço é obrigatório para criar o checklist.'
                });
            }

            const { data: checklist, error } = await supabase
                .from('device_checklists')
                .insert({
                    service_id: serviceId,
                    type,
                    items,
                    observations,
                    technician_signature: technicianSignature,
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;

            const uploadedPhotos = [];
            const files = req.files || [];

            for (const file of files) {
                const fileName = makeSafeFileName(file.originalname);
                const filePath = `${checklist.id}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from(BUCKET_NAME)
                    .upload(filePath, file.buffer, {
                        contentType: file.mimetype,
                        upsert: false
                    });

                if (uploadError) {
                    console.error('Erro ao enviar foto para o storage:', uploadError);
                    continue;
                }

                const { data: publicData } = supabase.storage
                    .from(BUCKET_NAME)
                    .getPublicUrl(filePath);

                const photoUrl = publicData?.publicUrl || '';

                const { data: photo, error: photoError } = await supabase
                    .from('checklist_photos')
                    .insert({
                        checklist_id: checklist.id,
                        photo_url: photoUrl,
                        file_path: filePath
                    })
                    .select()
                    .single();

                if (photoError) {
                    console.error('Erro ao salvar registro da foto:', photoError);
                    continue;
                }

                uploadedPhotos.push(photo);
            }

            return res.status(201).json({
                success: true,
                data: {
                    ...checklist,
                    photos: uploadedPhotos
                }
            });

        } catch (error) {
            console.error('Erro ao salvar checklist:', error);

            return res.status(500).json({
                success: false,
                error: error.message || 'Erro ao salvar checklist.'
            });
        }
    },

    async delete(req, res) {
        try {
            const { id } = req.params;

            const { data: photos } = await supabase
                .from('checklist_photos')
                .select('*')
                .eq('checklist_id', id);

            const paths = (photos || [])
                .map(photo => photo.file_path)
                .filter(Boolean);

            if (paths.length > 0) {
                const { error: removeError } = await supabase.storage
                    .from(BUCKET_NAME)
                    .remove(paths);

                if (removeError) {
                    console.error('Erro ao remover fotos do storage:', removeError);
                }
            }

            const { error } = await supabase
                .from('device_checklists')
                .delete()
                .eq('id', id);

            if (error) throw error;

            return res.json({
                success: true
            });

        } catch (error) {
            console.error('Erro ao excluir checklist:', error);

            return res.status(500).json({
                success: false,
                error: error.message || 'Erro ao excluir checklist.'
            });
        }
    }
};

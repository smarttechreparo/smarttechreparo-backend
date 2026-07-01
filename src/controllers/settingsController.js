import { supabase } from '../config/supabaseClient.js';

const DEFAULT_SETTINGS = {
    companyName: 'Smart Tech Reparo',
    pixDiscount: 7,
    debitDiscount: 5,
    creditIncrease: 0,
    dueDays: 30,
    interestAfter4Percent: 2
};

export const settingsController = {

    // ==========================
    // BUSCAR CONFIGURAÇÕES
    // ==========================
    async getSettings(req, res) {
        try {
            const { data, error } = await supabase
                .from('settings')
                .select('*')
                .limit(1)
                .maybeSingle();

            if (error) {
                console.warn('Tabela settings não encontrada ou erro ao buscar. Usando padrão:', error.message);

                return res.status(200).json({
                    success: true,
                    data: DEFAULT_SETTINGS
                });
            }

            if (!data) {
                return res.status(200).json({
                    success: true,
                    data: DEFAULT_SETTINGS
                });
            }

            return res.status(200).json({
                success: true,
                data: {
                    companyName: data.company_name || DEFAULT_SETTINGS.companyName,
                    pixDiscount: Number(data.pix_discount ?? DEFAULT_SETTINGS.pixDiscount),
                    debitDiscount: Number(data.debit_discount ?? DEFAULT_SETTINGS.debitDiscount),
                    creditIncrease: Number(data.credit_increase ?? DEFAULT_SETTINGS.creditIncrease),
                    dueDays: Number(data.due_days ?? DEFAULT_SETTINGS.dueDays),
                    interestAfter4Percent: Number(data.interest_after4_percent ?? DEFAULT_SETTINGS.interestAfter4Percent)
                }
            });

        } catch (error) {
            console.error('Erro ao buscar configurações:', error);

            return res.status(200).json({
                success: true,
                data: DEFAULT_SETTINGS
            });
        }
    },

    // ==========================
    // SALVAR CONFIGURAÇÕES
    // ==========================
    async saveSettings(req, res) {
        try {
            const settings = req.body || {};

            const payload = {
                id: 1,
                company_name: settings.companyName || DEFAULT_SETTINGS.companyName,
                pix_discount: Number(settings.pixDiscount ?? DEFAULT_SETTINGS.pixDiscount),
                debit_discount: Number(settings.debitDiscount ?? DEFAULT_SETTINGS.debitDiscount),
                credit_increase: Number(settings.creditIncrease ?? DEFAULT_SETTINGS.creditIncrease),
                due_days: Number(settings.dueDays ?? DEFAULT_SETTINGS.dueDays),
                interest_after4_percent: Number(settings.interestAfter4Percent ?? DEFAULT_SETTINGS.interestAfter4Percent),
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('settings')
                .upsert(payload, { onConflict: 'id' })
                .select()
                .single();

            if (error) {
                console.warn('Não foi possível salvar na tabela settings:', error.message);

                return res.status(200).json({
                    success: true,
                    data: settings,
                    warning: 'Configurações retornadas, mas não foram persistidas no banco.'
                });
            }

            return res.status(200).json({
                success: true,
                data: {
                    companyName: data.company_name,
                    pixDiscount: Number(data.pix_discount),
                    debitDiscount: Number(data.debit_discount),
                    creditIncrease: Number(data.credit_increase),
                    dueDays: Number(data.due_days),
                    interestAfter4Percent: Number(data.interest_after4_percent)
                }
            });

        } catch (error) {
            console.error('Erro ao salvar configurações:', error);

            return res.status(500).json({
                success: false,
                error: 'Erro ao salvar configurações.'
            });
        }
    }

};
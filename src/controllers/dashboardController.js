import { supabase } from '../config/supabaseClient.js';

function getTodayRange() {
    const now = new Date();

    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    return {
        start: start.toISOString(),
        end: end.toISOString()
    };
}

export const dashboardController = {

    // ==========================
    // ESTATÍSTICAS DO DASHBOARD
    // ==========================
    async getStats(req, res) {
        try {
            const { start, end } = getTodayRange();

            const [
                clientsResult,
                suppliersResult,
                partsResult,
                lowStockResult,
                todaySalesResult,
                pendingServicesResult
            ] = await Promise.all([

                supabase
                    .from('clients')
                    .select('id', { count: 'exact', head: true }),

                supabase
                    .from('suppliers')
                    .select('id', { count: 'exact', head: true }),

                supabase
                    .from('parts')
                    .select('id', { count: 'exact', head: true }),

                supabase
                    .from('parts')
                    .select('id, quantity, min_stock'),

                supabase
                    .from('sales')
                    .select('id, total_amount, status, created_at')
                    .gte('created_at', start)
                    .lte('created_at', end),

                supabase
                    .from('services')
                    .select('id, status')
                    .not('status', 'in', '("finalizado","entregue","cancelado","convertido")')
            ]);

            if (clientsResult.error) throw clientsResult.error;
            if (suppliersResult.error) throw suppliersResult.error;
            if (partsResult.error) throw partsResult.error;
            if (lowStockResult.error) throw lowStockResult.error;
            if (todaySalesResult.error) throw todaySalesResult.error;
            if (pendingServicesResult.error) throw pendingServicesResult.error;

            const lowStock = (lowStockResult.data || []).filter(part => {
                const quantity = Number(part.quantity) || 0;
                const minStock = Number(part.min_stock) || 0;

                return minStock > 0 && quantity <= minStock;
            }).length;

            const todaySales = (todaySalesResult.data || []).filter(sale =>
                sale.status !== 'cancelada'
            );

            const revenueToday = todaySales.reduce((sum, sale) => {
                return sum + (Number(sale.total_amount) || 0);
            }, 0);

            const stats = {
                totalClients: clientsResult.count || 0,
                totalSuppliers: suppliersResult.count || 0,
                totalParts: partsResult.count || 0,
                lowStock,
                todaySales: todaySales.length,
                revenueToday,
                pendingServices: pendingServicesResult.data?.length || 0,
                overduePayments: 0
            };

            return res.status(200).json({
                success: true,
                data: stats
            });

        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);

            return res.status(500).json({
                success: false,
                error: 'Erro ao carregar estatísticas do dashboard.'
            });
        }
    }

};
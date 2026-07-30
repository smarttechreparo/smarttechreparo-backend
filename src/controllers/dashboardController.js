import { supabase } from '../config/supabaseClient.js';

function toNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function getTodayRange() {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString() };
}

function getMonthRange() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString() };
}

function calculateSaleCost(items = []) {
    if (!Array.isArray(items)) return 0;

    return items.reduce((sum, item) => {
        const quantity = toNumber(item.quantity ?? item.qty, 1);
        const cost = toNumber(item.cost_price ?? item.costPrice ?? item.cost ?? item.purchase_price, 0);
        return sum + quantity * cost;
    }, 0);
}

export const dashboardController = {

    async getStats(req, res) {
        try {
            const today = getTodayRange();
            const month = getMonthRange();

            const [
                clientsResult,
                suppliersResult,
                partsInventoryResult,
                todaySalesResult,
                monthSalesResult,
                pendingServicesResult,
                expensesMonthResult
            ] = await Promise.all([
                supabase
                    .from('clients')
                    .select('id', { count: 'exact', head: true }),

                supabase
                    .from('suppliers')
                    .select('id', { count: 'exact', head: true }),

                supabase
                    .from('parts')
                    .select('id, quantity, min_stock, cost_price, sale_price'),

                supabase
                    .from('sales')
                    .select('id, total_amount, status, items, created_at')
                    .gte('created_at', today.start)
                    .lte('created_at', today.end),

                supabase
                    .from('sales')
                    .select('id, total_amount, status, items, created_at')
                    .gte('created_at', month.start)
                    .lte('created_at', month.end),

                supabase
                    .from('services')
                    .select('id, status')
                    .not('status', 'in', '("finalizado","entregue","cancelado","convertido")'),

                supabase
                    .from('expenses')
                    .select('id, amount, paid, status, created_at, due_date')
                    .gte('created_at', month.start)
                    .lte('created_at', month.end)
            ]);

            if (clientsResult.error) throw clientsResult.error;
            if (suppliersResult.error) throw suppliersResult.error;
            if (partsInventoryResult.error) throw partsInventoryResult.error;
            if (todaySalesResult.error) throw todaySalesResult.error;
            if (monthSalesResult.error) throw monthSalesResult.error;
            if (pendingServicesResult.error) throw pendingServicesResult.error;
            if (expensesMonthResult.error) throw expensesMonthResult.error;

            const parts = partsInventoryResult.data || [];

            const totalParts = parts.reduce((sum, part) => {
                return sum + Math.max(0, toNumber(part.quantity, 0));
            }, 0);

            const lowStock = parts.filter(part => {
                const quantity = toNumber(part.quantity, 0);
                const minStock = toNumber(part.min_stock, 0);
                return minStock > 0 && quantity <= minStock;
            }).length;

            const todaySales = (todaySalesResult.data || []).filter(sale => sale.status !== 'cancelada');
            const monthSales = (monthSalesResult.data || []).filter(sale => sale.status !== 'cancelada');

            const revenueToday = todaySales.reduce((sum, sale) => {
                return sum + toNumber(sale.total_amount, 0);
            }, 0);

            const revenueMonth = monthSales.reduce((sum, sale) => {
                return sum + toNumber(sale.total_amount, 0);
            }, 0);

            const costMonth = monthSales.reduce((sum, sale) => {
                return sum + calculateSaleCost(sale.items || []);
            }, 0);

            const expensesMonth = (expensesMonthResult.data || []).reduce((sum, expense) => {
                return sum + toNumber(expense.amount, 0);
            }, 0);

            const grossProfitMonth = revenueMonth - costMonth;
            const netProfitMonth = grossProfitMonth - expensesMonth;

            const stats = {
                totalClients: clientsResult.count || 0,
                totalSuppliers: suppliersResult.count || 0,
                totalParts,
                totalPartTypes: parts.length,
                lowStock,
                todaySales: todaySales.length,
                revenueToday,
                monthSales: monthSales.length,
                revenueMonth,
                totalSalesMonth: revenueMonth,
                grossProfitMonth,
                netProfitMonth,
                pendingServices: pendingServicesResult.data?.length || 0,
                overduePayments: 0,
                expensesMonth
            };

            return res.status(200).json({
                success: true,
                data: stats
            });

        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Erro ao carregar estatísticas do dashboard.'
            });
        }
    }
};

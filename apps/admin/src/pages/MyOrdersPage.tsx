import { useOverviewMetrics } from "@/hooks";
import { PlaceholderPage } from "./_helpers";
export function MyOrdersPage() {
  const { data, loading } = useOverviewMetrics();
  return (
    <PlaceholderPage title="Mes commandes" description="Route d'historique des commandes basee sur les donnees Supabase partagees.">
      <p className="muted">{loading ? "Chargement du resume des commandes..." : `Commandes recentes: ${data?.recentOrders.length ?? 0}`}</p>
    </PlaceholderPage>
  );
}

import { AuthExample } from "@/components/AuthExample";
import { IntegrationExample } from "@/components/IntegrationExample";
import { useOverviewMetrics } from "@/hooks";
import { formatMoney } from "@/lib/utils";
import { PlaceholderPage } from "./_helpers";

export function HomePage() {
  const { data, loading } = useOverviewMetrics();

  return (
    <PlaceholderPage
      title="Accueil du tableau de bord"
      description="Vue SPA typee alimentee par la couche de services partagee."
    >
      <div className="page-grid">
        <article className="stat-card">
          <div className="muted">Revenu</div>
          <strong>{loading ? "Chargement..." : formatMoney(data?.metrics.revenue ?? 0)}</strong>
        </article>
        <article className="stat-card">
          <div className="muted">Commandes</div>
          <strong>{loading ? "Chargement..." : data?.metrics.orders ?? 0}</strong>
        </article>
        <article className="stat-card">
          <div className="muted">Clients</div>
          <strong>{loading ? "Chargement..." : data?.metrics.customers ?? 0}</strong>
        </article>
      </div>
      <IntegrationExample />
      <AuthExample />
    </PlaceholderPage>
  );
}

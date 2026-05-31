import { useOverviewMetrics, useSanityProducts } from "@/hooks";
import { formatMoney } from "@/lib/utils";

export function IntegrationExample() {
  const { data, loading } = useOverviewMetrics();
  const { products, loading: productsLoading } = useSanityProducts();

  return (
    <section className="page-card stack">
      <div className="page-header">
        <div>
          <h2>Exemple d'integration</h2>
          <p className="muted">Sanity et Supabase sont consommes depuis la couche de hooks.</p>
        </div>
      </div>
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
          <div className="muted">Produits</div>
          <strong>{productsLoading ? "Chargement..." : products.length}</strong>
        </article>
      </div>
    </section>
  );
}

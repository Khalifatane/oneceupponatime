import { useSanityProducts } from "@/hooks";
import { formatMoney } from "@/lib/utils";
import { PlaceholderPage } from "./_helpers";

export function ProductListingPage() {
  const { products, loading } = useSanityProducts();

  return (
    <PlaceholderPage
      title="Liste des produits"
      description="Catalogue produits Sanity dans le runtime SPA type."
    >
      {loading ? (
        <p className="muted">Chargement des produits...</p>
      ) : (
        <table className="table-preview">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Categorie</th>
              <th>Prix</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {products.slice(0, 8).map((product) => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>{product.category}</td>
                <td>{formatMoney(product.price)}</td>
                <td>{product.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </PlaceholderPage>
  );
}

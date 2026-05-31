import { useParams } from "react-router-dom";
import { useSanityProductBySlug } from "@/hooks";
import { formatMoney } from "@/lib/utils";
import { PlaceholderPage } from "./_helpers";

export function ProductDetailPage() {
  const params = useParams();
  const slug = params.slug || "product-detail";
  const { product, loading } = useSanityProductBySlug(slug);

  return (
    <PlaceholderPage
      title="Detail produit"
      description="Les parametres de route sont resolus en recherches Sanity via la couche de hooks."
    >
      {loading ? (
        <p className="muted">Chargement du produit...</p>
      ) : product ? (
        <div className="stack">
          <strong>{product.name}</strong>
          <span className="muted">{product.category}</span>
          <span>{formatMoney(product.price)}</span>
        </div>
      ) : (
        <p className="muted">Aucun produit selectionne.</p>
      )}
    </PlaceholderPage>
  );
}

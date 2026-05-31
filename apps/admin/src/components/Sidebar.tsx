import { NavLink } from "react-router-dom";

export function Sidebar() {
  return (
    <aside className="sidebar">
      <strong>SPA Routes</strong>
      <nav>
        <NavLink className="nav-link" to="/">Overview</NavLink>
        <NavLink className="nav-link" to="/product-listing">Product Listing</NavLink>
        <NavLink className="nav-link" to="/product-detail">Detail produit</NavLink>
        <NavLink className="nav-link" to="/cart">Panier</NavLink>
        <NavLink className="nav-link" to="/checkout">Paiement</NavLink>
        <NavLink className="nav-link" to="/my-orders">Mes commandes</NavLink>
      </nav>
    </aside>
  );
}

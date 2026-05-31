import { NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function Navbar() {
  const { user, status } = useAuth();

  return (
    <header className="topbar">
      <div>
        <strong>Admin hybride</strong>
        <div className="muted">Runtime HTML + SPA TypeScript</div>
      </div>
      <nav>
        <NavLink className="nav-link" to="/">Accueil</NavLink>
        <NavLink className="nav-link" to="/product-listing">Produits</NavLink>
        <NavLink className="nav-link" to="/my-orders">Commandes</NavLink>
        <NavLink className="nav-link" to="/personal-info">Compte</NavLink>
      </nav>
      <div className="pill">
        {status === "authenticated" ? user?.email : "Mode invite"}
      </div>
    </header>
  );
}

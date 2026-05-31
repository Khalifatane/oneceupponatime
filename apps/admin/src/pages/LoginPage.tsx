import { useAuth } from "@/contexts/AuthContext";
import { PlaceholderPage } from "./_helpers";
export function LoginPage() {
  const auth = useAuth();
  return <PlaceholderPage title="Connexion" description={`Statut d'authentification actuel: ${auth.status}.`} />;
}

import { useAuth } from "@/contexts/AuthContext";
import { PlaceholderPage } from "./_helpers";
export function PersonalInfoPage() {
  const auth = useAuth();
  return (
    <PlaceholderPage title="Informations personnelles" description="Route profil utilisant le contexte d'authentification partage.">
      <pre>{JSON.stringify(auth.user, null, 2)}</pre>
    </PlaceholderPage>
  );
}

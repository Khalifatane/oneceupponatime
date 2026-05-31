import { PageShell } from "@/components/ui/PageShell";

export function PlaceholderPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <PageShell title={title} description={description}>
      {children ?? <p className="muted">Cette route est preparee et prete pour les prochaines fonctionnalites.</p>}
    </PageShell>
  );
}

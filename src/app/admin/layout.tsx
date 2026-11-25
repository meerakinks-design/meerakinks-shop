import '@/styles/admin.css';

/**
 * Racine du back-office (connexion comprise) : charge la feuille de style de l'admin, qui n'agit que sous .admin-root.
 * La vitrine ne charge jamais ce fichier, et inversement.
 */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin-root">{children}</div>;
}

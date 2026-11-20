import Link from 'next/link';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: { href: string; label: string };
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {action && (
        <Link className="btn" href={action.href}>
          {action.label}
        </Link>
      )}
    </div>
  );
}

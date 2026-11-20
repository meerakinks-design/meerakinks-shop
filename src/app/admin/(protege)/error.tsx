'use client';

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card" role="alert">
      <h2>Une erreur est survenue</h2>
      <p>Réessaie. Si le problème continue, donne cette référence : {error.digest ?? 'inconnue'}.</p>
      <button className="btn" type="button" onClick={reset}>
        Réessayer
      </button>
    </div>
  );
}

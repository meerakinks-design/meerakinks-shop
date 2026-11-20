'use client';

export default function ShopError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container page-narrow" role="alert">
      <h1>Un souci est survenu.</h1>
      <p>Réessayez dans un instant. Si le problème continue, communiquez cette référence à la boutique : {error.digest ?? 'inconnue'}.</p>
      <button type="button" className="btn" onClick={reset}>
        Réessayer
      </button>
    </div>
  );
}

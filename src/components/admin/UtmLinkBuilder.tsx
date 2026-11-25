'use client';

import { useId, useMemo, useState } from 'react';

// Générateur de liens balisés (cahier §7.6) : « d'où viennent mes visiteurs ? ». WhatsApp n'envoie aucune provenance :
// un lien balisé est le seul moyen de la connaître. Le lien est construit ici, dans le navigateur : rien n'est envoyé.

const CHANNELS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'newsletter', label: 'Newsletter' },
] as const;

const slug = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

export function UtmLinkBuilder({ siteUrl }: { siteUrl: string }) {
  const id = useId();
  const [path, setPath] = useState('/');
  const [channel, setChannel] = useState<string>(CHANNELS[0].value);
  const [campaign, setCampaign] = useState('');
  const [copied, setCopied] = useState(false);

  const link = useMemo(() => {
    const cleanPath = path.trim().startsWith('/') ? path.trim().split(/[?#]/)[0] ?? '/' : `/${path.trim().split(/[?#]/)[0] ?? ''}`;
    const params = new URLSearchParams({ utm_source: channel });
    const name = slug(campaign);
    if (name) params.set('utm_campaign', name);
    return `${siteUrl.replace(/\/+$/, '')}${cleanPath}?${params.toString()}`;
  }, [siteUrl, path, channel, campaign]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="card stack" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>Lien balisé</h2>
      <p className="help-text">Partagez ce lien (bio Instagram, message WhatsApp, newsletter) : le site saura d’où vient la personne qui l’ouvre.</p>
      <div className="zone-fields">
        <div className="field">
          <label htmlFor={`${id}-path`}>Page</label>
          <input id={`${id}-path`} value={path} onChange={(event) => setPath(event.target.value)} placeholder="/" />
        </div>
        <div className="field">
          <label htmlFor={`${id}-channel`}>Où le partagez-vous ?</label>
          <select id={`${id}-channel`} value={channel} onChange={(event) => setChannel(event.target.value)}>
            {CHANNELS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${id}-campaign`}>Nom de l’action (facultatif)</label>
          <input id={`${id}-campaign`} value={campaign} onChange={(event) => setCampaign(event.target.value)} placeholder="lancement-noel" maxLength={60} />
        </div>
      </div>
      {!siteUrl && <p className="help-text">L’adresse du site (NEXT_PUBLIC_SITE_URL) n’est pas définie : ajoutez-la devant le lien ci-dessous avant de le partager.</p>}
      <p className="utm-link" aria-live="polite">
        <code>{link}</code>
      </p>
      <div className="form-actions">
        <button type="button" className="btn" onClick={copy}>
          {copied ? 'Lien copié' : 'Copier le lien'}
        </button>
        <a className="btn btn-quiet" href={`https://wa.me/?text=${encodeURIComponent(link)}`} target="_blank" rel="noopener noreferrer">
          Envoyer sur WhatsApp
        </a>
      </div>
    </section>
  );
}

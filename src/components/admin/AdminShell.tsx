'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cld } from '@/lib/cloudinary-static';
import { ADMIN_HOME_PATH } from '@/lib/constants/auth';
import { PUBLIC_ROUTES } from '@/lib/constants/routes';
import { AdminMobileMenu } from './AdminMobileMenu';
import { AdminNav } from './AdminNav';

/**
 * Coque du back-office.
 * - Ordinateur (≥ 900 px) : barre latérale façon E-Carnet (logo + bouton de repli, entrées regroupées, compte en bas qui ouvre
 *   un menu), repliable en rail d'icônes ; le choix est mémorisé dans le navigateur. L'en-tête ne garde que « Boutique ».
 * - Téléphone et tablette : en-tête identique à celui de la landing (logo à gauche, bouton orange, bouton rond) et barre de
 *   navigation flottante en bas.
 * Les contenus du compte (liens, déconnexion) sont rendus côté serveur et passés en `sidebarAccount` / `sheetAccount`.
 */
const RAIL_STORAGE_KEY = 'meera-admin-rail';

interface AdminShellProps {
  isOwner: boolean;
  name: string;
  initial: string;
  sidebarAccount: ReactNode;
  sheetAccount: ReactNode;
  children: ReactNode;
}

function SidebarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
      <path d="M9.5 4.5v15" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg className="admin-acct-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="m6 15 6-6 6 6" />
    </svg>
  );
}

/** Compte en bas de la barre latérale : une ligne qui ouvre le menu (liens du compte, déconnexion). */
function AccountMenu({ name, initial, role, children }: { name: string; initial: string; role: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  return (
    <div className="admin-side-foot" ref={rootRef} onKeyDown={onKeyDown}>
      <div id={popId} className="admin-acct-pop" data-open={open} role="group" aria-label={`Compte de ${name}`} onClick={(event) => (event.target as HTMLElement).closest('a') && setOpen(false)}>
        {children}
      </div>
      <button ref={triggerRef} type="button" className="admin-acct-trigger" aria-expanded={open} aria-controls={popId} aria-label={`Compte de ${name}`} title={name} onClick={() => setOpen((current) => !current)}>
        <span className="admin-acct-avatar" aria-hidden="true">
          {initial}
        </span>
        <span className="admin-acct-copy">
          <strong>{name}</strong>
          <small>{role}</small>
        </span>
        <ChevronIcon />
      </button>
    </div>
  );
}

export function AdminShell({ isOwner, name, initial, sidebarAccount, sheetAccount, children }: AdminShellProps) {
  const [rail, setRail] = useState(false);

  // Préférence de repli : lue après l'affichage (le serveur ne la connaît pas), sans jamais casser si le stockage est bloqué.
  useEffect(() => {
    try {
      if (window.localStorage.getItem(RAIL_STORAGE_KEY) === '1') setRail(true);
    } catch {
      /* stockage indisponible : barre dépliée */
    }
  }, []);

  function toggleRail() {
    setRail((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(RAIL_STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* le repli fonctionne quand même pour cette visite */
      }
      return next;
    });
  }

  return (
    <div className={`admin-app${rail ? ' is-rail' : ''}`}>
      <a className="admin-skip" href="#admin-contenu">
        Aller au contenu
      </a>

      <aside className="admin-side" aria-label="Menu du back-office">
        <div className="admin-side-head">
          <Link href={ADMIN_HOME_PATH} className="admin-brand" aria-label="Back-office Meëra Kinks : tableau de bord">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="admin-brand-full" src="/brand/logo-meera-kinks-beige.png" alt="" width={240} height={94} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="admin-brand-mark" src="/brand/favicon-icon.png" alt="" width={40} height={40} />
            <span className="admin-side-tag" aria-hidden="true">
              Back-office
            </span>
          </Link>
          <button type="button" className="admin-side-toggle" onClick={toggleRail} aria-expanded={!rail} aria-label={rail ? 'Déplier la navigation' : 'Replier la navigation'} title={rail ? 'Déplier' : 'Replier'}>
            <SidebarIcon />
          </button>
        </div>
        <div className="admin-side-scroll">
          <AdminNav variant="side" isOwner={isOwner} />
        </div>
        <AccountMenu name={name} initial={initial} role={isOwner ? 'Propriétaire' : 'Équipe'}>
          {sidebarAccount}
        </AccountMenu>
      </aside>

      <div className="admin-body">
        {/* Même en-tête que la landing : logo à gauche, bouton orange, bouton carré à bordure marron. Sur ordinateur, le logo et le compte sont dans la barre latérale. */}
        <header className="admin-header">
          <div className="admin-header-inner">
            <Link href={ADMIN_HOME_PATH} className="admin-header-brand" aria-label="Back-office Meëra Kinks : tableau de bord">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cld('/brand/logo-meera-kinks.png', { width: 400 })} alt="" width={133} height={52} />
            </Link>
            <div className="admin-header-actions">
              <Link className="admin-header-shop" href={PUBLIC_ROUTES.home} target="_blank" rel="noopener noreferrer">
                Boutique
                <span className="sr-only"> (s’ouvre dans un nouvel onglet)</span>
              </Link>
              <AdminMobileMenu initial={initial}>{sheetAccount}</AdminMobileMenu>
            </div>
          </div>
        </header>

        <div id="admin-contenu" className="admin-content" tabIndex={-1}>
          {children}
        </div>
      </div>

      <AdminNav variant="tabs" isOwner={isOwner} />
    </div>
  );
}

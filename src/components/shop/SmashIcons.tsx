import type { SVGProps } from 'react';

/**
 * Icônes des commandes du mini-jeu « Cosmetic Smash ». Même écriture que celles du header (Header.tsx) : trait arrondi,
 * couleur du texte (`currentColor`). Décoratives : le nom du bouton (aria-label) porte le sens, jamais l'icône.
 */
function Icon({ children, size = 24, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

type IconProps = { size?: number };

export function PauseIcon({ size }: IconProps) {
  return (
    <Icon size={size} fill="currentColor" strokeWidth="1.5">
      <rect x="6" y="5" width="4" height="14" rx="1.25" />
      <rect x="14" y="5" width="4" height="14" rx="1.25" />
    </Icon>
  );
}

export function PlayIcon({ size }: IconProps) {
  return (
    <Icon size={size} fill="currentColor" strokeWidth="1.5">
      <path d="M8 5.6v12.8a1 1 0 0 0 1.52.85l10.4-6.4a1 1 0 0 0 0-1.7L9.52 4.75A1 1 0 0 0 8 5.6Z" />
    </Icon>
  );
}

export function RestartIcon({ size }: IconProps) {
  return (
    <Icon size={size}>
      <path d="M20.5 12a8.5 8.5 0 1 1-2.5-6.02" />
      <path d="M20.5 3.5v4.5H16" />
    </Icon>
  );
}

export function SoundOnIcon({ size }: IconProps) {
  return (
    <Icon size={size}>
      <path d="M4 9.75v4.5h3.4l4.35 3.7a.6.6 0 0 0 .99-.46V6.51a.6.6 0 0 0-.99-.46L7.4 9.75H4Z" />
      <path d="M15.6 9.2a4 4 0 0 1 0 5.6" />
      <path d="M18.4 6.6a8 8 0 0 1 0 10.8" />
    </Icon>
  );
}

export function SoundOffIcon({ size }: IconProps) {
  return (
    <Icon size={size}>
      <path d="M4 9.75v4.5h3.4l4.35 3.7a.6.6 0 0 0 .99-.46V6.51a.6.6 0 0 0-.99-.46L7.4 9.75H4Z" />
      <path d="m16 9.5 5 5" />
      <path d="m21 9.5-5 5" />
    </Icon>
  );
}

'use client';

interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  /** 0 autorise le retrait (carte, panier) ; 1 pour la fiche produit. */
  min?: number;
  max: number;
  label: string;
  compact?: boolean;
}

export function QuantityStepper({ value, onChange, min = 0, max, label, compact = false }: QuantityStepperProps) {
  return (
    <div className={`stepper${compact ? ' stepper-compact' : ''}`} role="group" aria-label={`Quantité : ${label}`}>
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={value <= 1 && min === 0 ? `Retirer ${label} du panier` : `Diminuer la quantité de ${label}`}>
        <span aria-hidden="true">−</span>
      </button>
      <output aria-live="polite">{value}</output>
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`Augmenter la quantité de ${label}`}>
        <span aria-hidden="true">+</span>
      </button>
    </div>
  );
}

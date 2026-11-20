'use client';

import Link from 'next/link';
import { LANDING } from '@/content/landing';
import { MODAL_HASHES, PUBLIC_ROUTES } from '@/lib/constants/routes';
import { fill } from '@/lib/shop/template';
import { Modal } from './Modal';
import { useModal } from './useModal';

/** « Notre histoire » : le texte complet est dans le HTML dès le chargement (indexable), masqué jusqu'à l'ouverture. */
export function HistoryModal({ storeName }: { storeName: string }) {
  const { close } = useModal(MODAL_HASHES.story);
  const story = LANDING.story;
  return (
    <Modal hash={MODAL_HASHES.story} title={story.title} className="modal-story">
      <p className="eyebrow">{story.eyebrow}</p>
      {story.intro.map((paragraph) => (
        <p key={paragraph}>{fill(paragraph, { storeName })}</p>
      ))}
      <h3>{story.visionTitle}</h3>
      <p>{story.vision}</p>
      <h3>{story.commitmentTitle}</h3>
      <p>{story.commitment}</p>
      <Link className="btn" href={PUBLIC_ROUTES.shop} onClick={close}>
        {story.closeCta}
      </Link>
    </Modal>
  );
}

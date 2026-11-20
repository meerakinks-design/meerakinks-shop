'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { postJson } from '@/lib/api-client';
import { ADMIN_LOGIN_PATH, LOGOUT_API_PATH } from '@/lib/constants/auth';

export function LogoutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleLogout() {
    setIsPending(true);
    await postJson(LOGOUT_API_PATH);
    router.replace(ADMIN_LOGIN_PATH);
    router.refresh();
  }

  return (
    <button className="btn btn-quiet" type="button" onClick={handleLogout} disabled={isPending}>
      {isPending ? 'Déconnexion…' : 'Se déconnecter'}
    </button>
  );
}

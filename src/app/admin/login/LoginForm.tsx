'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { postJson } from '@/lib/api-client';
import type { ApiFieldErrors } from '@/lib/api-result';
import { ADMIN_HOME_PATH, LOGIN_API_PATH } from '@/lib/constants/auth';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ApiFieldErrors>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setErrorMessage(null);
    setFieldErrors({});

    const result = await postJson<{ admin: { name: string } }>(LOGIN_API_PATH, { email, password });

    if (result.ok) {
      router.replace(ADMIN_HOME_PATH);
      router.refresh();
      return;
    }
    setErrorMessage(result.error.message);
    setFieldErrors(result.error.fields ?? {});
    setIsPending(false);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {errorMessage && (
        <p className="alert-error" role="alert">
          {errorMessage}
        </p>
      )}

      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? 'email-error' : undefined}
          required
        />
        {fieldErrors.email && (
          <p id="email-error" className="field-error">
            {fieldErrors.email[0]}
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor="password">Mot de passe</label>
        <div className="inline-fields">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? 'password-error' : undefined}
            required
          />
          <button type="button" className="btn btn-quiet" onClick={() => setShowPassword((value) => !value)} aria-pressed={showPassword}>
            {showPassword ? 'Masquer' : 'Afficher'}
          </button>
        </div>
        {fieldErrors.password && (
          <p id="password-error" className="field-error">
            {fieldErrors.password[0]}
          </p>
        )}
      </div>

      <button className="btn" type="submit" disabled={isPending}>
        {isPending ? 'Connexion…' : 'Se connecter'}
      </button>
    </form>
  );
}

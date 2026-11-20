import { z } from 'zod';

// Variables lues par l'application. Resend, Cloudinary et le secret du cron sont facultatifs : sans eux, la fonction
// correspondante reste simplement inactive (emails en attente, photos désactivées, tâche planifiée fermée).
// Une variable laissée vide (« RESEND_API_KEY= », comme dans .env.example) équivaut à une variable absente : sans cela,
// copier .env.example tel quel ferait échouer toute la validation et planter l'application.
const optional = <T extends z.ZodTypeAny>(schema: T) => z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: optional(z.string().url()),
  RESEND_API_KEY: optional(z.string().min(1)),
  EMAIL_FROM: optional(z.string().min(1)),
  CLOUDINARY_CLOUD_NAME: optional(z.string().min(1)),
  CLOUDINARY_API_KEY: optional(z.string().min(1)),
  CLOUDINARY_API_SECRET: optional(z.string().min(1)),
  CRON_SECRET: optional(z.string().min(16)),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | undefined;

/** Valide l'environnement une fois. L'erreur ne cite que les NOMS des variables, jamais leurs valeurs. */
export function getServerEnv(): ServerEnv {
  if (cachedEnv) return cachedEnv;
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const names = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Variables d'environnement invalides ou manquantes : ${names}`);
  }
  cachedEnv = parsed.data;
  return cachedEnv;
}

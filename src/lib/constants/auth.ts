// Constantes d'authentification. Importé aussi par le middleware (runtime Edge) :
// ce fichier ne doit rien importer de Node ni de Prisma.

const isProduction = process.env.NODE_ENV === 'production';

// Le préfixe __Host- impose Secure + Path=/ + pas de Domain : le cookie ne peut pas être
// posé par un sous-domaine. Il est refusé en http (dev), d'où le nom simple hors production.
export const SESSION_COOKIE_NAME = isProduction ? '__Host-admin_session' : 'admin_session';
export const IS_PRODUCTION = isProduction;

export const SESSION_TTL_DAYS = 7;
export const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

export const ADMIN_HOME_PATH = '/admin';
export const ADMIN_LOGIN_PATH = '/admin/login';
export const LOGIN_API_PATH = '/api/v1/admin/auth/login';
export const LOGOUT_API_PATH = '/api/v1/admin/auth/logout';

// Limites de tentatives de connexion : fenêtre fixe de 15 minutes.
export const LOGIN_WINDOW_SECONDS = 15 * 60;
export const LOGIN_MAX_ATTEMPTS_PER_IP = 10;
export const LOGIN_MAX_ATTEMPTS_PER_EMAIL = 5;

// bcrypt ne lit que les 72 premiers octets : au-delà, deux mots de passe différents seraient équivalents.
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_BYTES = 72;
export const BCRYPT_COST = 12;

export const CHANGE_PASSWORD_API_PATH = '/api/v1/admin/auth/password';
export const ADMIN_PASSWORD_PATH = '/admin/mot-de-passe';
export const PASSWORD_CHANGE_MAX_ATTEMPTS = 5;
export const PASSWORD_CHANGE_WINDOW_SECONDS = LOGIN_WINDOW_SECONDS;

// Dates du back-office : toujours à l'heure d'Abidjan (UTC+0), quel que soit le fuseau du serveur ou du navigateur.
const TIME_ZONE = 'Africa/Abidjan';

const dateTime = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: TIME_ZONE });
const day = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TIME_ZONE });

export const formatDateTime = (date: Date | string): string => dateTime.format(new Date(date));
export const formatDay = (date: Date | string): string => day.format(new Date(date));

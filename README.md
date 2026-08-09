# nolocksupabase v1.2

Fa 10 SELECT sulla tabella `public.keepalive` per ciascun Supabase.
Se uno o più progetti falliscono, invia una mail tramite Resend.

## Variabili Vercel da aggiungere
- `RESEND_API_KEY`
- `ALERT_EMAIL` = `kevindavide31@gmail.com`
- `ALERT_FROM` opzionale

Se `ALERT_FROM` è vuoto, viene usato:
`Supabase Keeper <onboarding@resend.dev>`

Nota: `onboarding@resend.dev` è un mittente di test Resend e può inviare soltanto
all'indirizzo associato all'account Resend. Per uso normale configura un dominio
verificato su Resend e imposta `ALERT_FROM`, ad esempio:
`Supabase Keeper <alerts@tuodominio.it>`

## Stati
- 200: tutti i Supabase OK, nessuna email
- 207: almeno un Supabase in errore; tenta l'invio email
- 401: chiamata non autorizzata

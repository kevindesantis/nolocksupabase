# nolocksupabase

Versione 1.1: esegue 10 SELECT reali sulla tabella `public.keepalive`
per ciascun progetto Supabase.

## Importante
Le URL e le anon/publishable key restano nelle Environment Variables di Vercel.
Non inserirle su GitHub.

## Tabella richiesta su ogni Supabase
Deve esistere `public.keepalive` ed essere leggibile dal ruolo anon tramite RLS policy.

## Cron
Ogni giorno alle 10:00 UTC Vercel richiama `/api/keepalive`.

## Risultati
- HTTP 200 = tutte le 10 richieste sono riuscite su tutti i progetti.
- HTTP 207 = almeno una richiesta/progetto ha fallito.
- HTTP 401 = CRON_SECRET non valido/mancante.

# nolocksupabase

Keeper centralizzato per effettuare richieste periodiche ai progetti Supabase.

## Sicurezza

Le chiavi NON sono incluse nel repository. Inseriscile nelle Environment Variables di Vercel.
Non usare `service_role` / secret key: usa soltanto `anon` o publishable key.

## Variabili Vercel

Crea:
- `CRON_SECRET`
- `INVENTARIODPZ_URL`, `INVENTARIODPZ_KEY`
- `GESTIONALEDPZ_URL`, `GESTIONALEDPZ_KEY`
- `COMANDAPP_URL`, `COMANDAPP_KEY`
- `DUEPUNTOZERO_URL`, `DUEPUNTOZERO_KEY`
- `DAMORGANTE_URL`, `DAMORGANTE_KEY`
- `TAVERNETTA_URL`, `TAVERNETTA_KEY`

Imposta le variabili almeno per Production.

## Cron

`vercel.json` richiama `/api/keepalive` ogni giorno alle 10:00 UTC.
Vercel invia automaticamente `Authorization: Bearer <CRON_SECRET>` quando `CRON_SECRET`
è configurato nel progetto.

A ogni esecuzione vengono effettuate 10 richieste per ciascun Supabase.

## Test manuale

Dopo il deploy puoi chiamare:

curl -H "Authorization: Bearer IL_TUO_CRON_SECRET" https://TUO-DOMINIO.vercel.app/api/keepalive

La risposta JSON mostra lo stato di ogni progetto.

## Nota

Questo keeper genera attività esterna verso l'API Supabase, ma non costituisce una
garanzia contrattuale contro il pausing dei progetti Free. Per la garanzia ufficiale
contro il pausing occorre fare riferimento al piano Supabase applicabile.

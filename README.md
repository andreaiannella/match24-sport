# Match24 Sport

Piattaforma per trovare partite di padel e calcetto.

## Stack Tecnologico

- **Framework**: Next.js 14 (App Router)
- **Linguaggio**: TypeScript
- **Stile**: Tailwind CSS
- **UI**: React Components (Custom)

## Struttura del Progetto

- `src/app`: Pagine e API routes
- `src/components`: Componenti UI riutilizzabili
- `src/lib`: Utility functions
- `src/types`: Definizioni TypeScript
- `src/data`: Dati mock

## Come iniziare

Poiché il progetto è stato creato manualmente, assicurati di avere Node.js installato.

1.  **Installare le dipendenze**:
    ```bash
    npm install
    ```

2.  **Avviare il server di sviluppo**:
    ```bash
    npm run dev
    ```

3.  Apri [http://localhost:3000](http://localhost:3000) nel tuo browser.

## Pagine Principali

- `/`: Landing page pubblica
- `/login`: Pagina di accesso
- `/dashboard/player`: Dashboard giocatore
- `/dashboard/club`: Dashboard circolo

## API

Il progetto usa dati mock serviti tramite API routes interne:
- `/api/player/overview`
- `/api/player/matches`
- `/api/club/overview`
- `/api/club/matches`

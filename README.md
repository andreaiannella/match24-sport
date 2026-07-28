# Match Sport 24

App di matchmaking sportivo (padel, tennis, calcetto, calcio a 8): prenotazione campi, ricerca partite, gestione circoli.

## Struttura

- `frontend/` — app mobile (Expo / React Native, iOS + Android)
- `backend/` — API (FastAPI + MongoDB), vedi `backend/.env.example` per le variabili richieste e `backend/Dockerfile` per il deploy

## Sviluppo locale

**Backend**
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # e compila con i valori reali
uvicorn server:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npx expo start
```

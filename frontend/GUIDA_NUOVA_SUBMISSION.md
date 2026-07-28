# Guida Nuova Submission v1.1.1 - Apple App Store

## Modifiche Apportate (Fix per Apple Review)

### 1. Configurazione Backend URL nel Build di Produzione
- Aggiunto `EXPO_PUBLIC_BACKEND_URL` in `eas.json` per il build production
- Aggiunto `backendUrl` in `app.json > extra` come fallback
- Aggiunto fallback hardcoded nel client API come ultima risorsa

### 2. Versione Aggiornata
- **Versione**: 1.1.1
- **iOS buildNumber**: 2
- **Android versionCode**: 2

### 3. Migliorato Error Handling
- Aggiunto logging dettagliato in login/register
- Messaggi di errore più chiari per l'utente

### 4. Utente Demo Apple
L'utente demo per Apple Review è configurato e funzionante:
- **Email**: `reviewer@apple.com`
- **Password**: `AppleReview2024!`

---

## Istruzioni per il Build e Submission

### Step 1: Clona il repository da GitHub
```bash
git clone https://github.com/TUO_USERNAME/TUO_REPO.git
cd TUO_REPO/frontend
```

### Step 2: Installa le dipendenze
```bash
npm install
```

### Step 3: Verifica che hai EAS CLI installato
```bash
npx eas --version
```

### Step 4: Fai il Build per iOS
```bash
npx eas build --platform ios --profile production
```

Questo comando:
- Compila l'app con le variabili d'ambiente corrette
- Crea un file .ipa pronto per l'App Store

### Step 5: Submit automatico (opzionale)
Se hai configurato le credenziali in eas.json:
```bash
npx eas submit --platform ios --latest
```

### Step 6: Oppure carica manualmente
1. Vai su https://appstoreconnect.apple.com
2. Seleziona la tua app
3. Vai in "TestFlight" o "App Store"
4. Clicca "+" per aggiungere una nuova build
5. Carica il file .ipa generato

---

## Credenziali per Apple Review

Quando ti chiedono le credenziali demo:

**Email**: `reviewer@apple.com`
**Password**: `AppleReview2024!`

Queste credenziali sono salvate nel database e funzioneranno sempre.

---

## Verifica Pre-Submit

Prima di inviare, verifica che:

1. ✅ Versione sia 1.1.1 (controlla app.json)
2. ✅ buildNumber sia 2 (controlla app.json > ios)
3. ✅ L'URL del backend sia configurato in eas.json > build > production > env
4. ✅ Le credenziali demo siano corrette

---

## Cosa è stato risolto

| Problema | Soluzione |
|----------|-----------|
| URL backend non raggiungibile | Aggiunto URL esplicito in eas.json per build production |
| Credenziali demo non valide | Verificato che l'utente reviewer@apple.com esiste nel DB |
| Registrazione falliva | Migliorato error handling e logging |
| Versione precedente rifiutata | Incrementata versione a 1.1.1, buildNumber a 2 |

---

## Supporto

Se hai problemi durante il build o la submission, controlla:
1. Il log di errore completo
2. Che tutte le dipendenze siano installate
3. Che le credenziali Apple siano configurate correttamente in eas.json

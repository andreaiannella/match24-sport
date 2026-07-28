# 🚀 Guida Completa: Pubblicazione Match Sport 24

## PARTE 1: Scarica il Codice da Emergent

### Opzione A: Download Diretto (Consigliato)
1. Nella chat di Emergent, clicca sul pulsante **"Download"** in alto a destra
2. Verrà scaricato un file ZIP con tutto il progetto
3. Estrai lo ZIP in una cartella sul tuo computer (es. `~/Progetti/match-sport-24`)

### Opzione B: Push su GitHub
1. Nella chat di Emergent, clicca su **"Push to GitHub"**
2. Collega il tuo account GitHub
3. Crea un nuovo repository
4. Clona il repository sul tuo computer:
```bash
git clone https://github.com/TUO_USERNAME/match-sport-24.git
cd match-sport-24
```

---

## PARTE 2: Prepara il Tuo Computer

### 2.1 Installa Node.js
Scarica e installa Node.js da: https://nodejs.org (versione LTS)

Verifica l'installazione:
```bash
node --version  # Deve essere >= 18.0.0
npm --version   # Deve essere >= 9.0.0
```

### 2.2 Installa EAS CLI
```bash
npm install -g eas-cli
```

### 2.3 Crea Account Expo (Gratuito)
1. Vai su https://expo.dev/signup
2. Registrati con email o GitHub
3. Verifica la tua email

### 2.4 Login EAS
```bash
eas login
```
Inserisci le credenziali del tuo account Expo.

---

## PARTE 3: Configura il Progetto

### 3.1 Entra nella cartella frontend
```bash
cd match-sport-24/frontend
```

### 3.2 Installa le dipendenze
```bash
npm install
```

### 3.3 Configura EAS per il progetto
```bash
eas build:configure
```
Quando chiede, seleziona:
- Platform: **All**
- Questo creerà/aggiornerà il file `eas.json`

### 3.4 Aggiorna app.json con il tuo owner
Apri `app.json` e modifica:
```json
{
  "expo": {
    "owner": "TUO_USERNAME_EXPO",
    ...
  }
}
```

---

## PARTE 4: Build per iOS (App Store)

### 4.1 Prepara le credenziali Apple
Avrai bisogno di:
- **Apple ID**: la tua email Apple Developer
- **Apple Team ID**: lo trovi su https://developer.apple.com/account → Membership
- **App-specific password**: creala su https://appleid.apple.com → Sicurezza → Password specifiche per le app

### 4.2 Crea il Build iOS
```bash
eas build --platform ios --profile production
```

Durante il processo:
1. Ti chiederà di fare login con Apple ID
2. EAS creerà automaticamente i certificati necessari
3. Il build richiede circa 15-30 minuti
4. Al termine, riceverai un link per scaricare il file `.ipa`

### 4.3 Sottometti all'App Store
```bash
eas submit --platform ios --latest
```

Quando richiesto, inserisci:
- **Apple ID**: tua email
- **App-specific password**: quella creata prima
- **ASC App ID**: lo trovi su App Store Connect dopo aver creato l'app (vedi sotto)

### 4.4 Crea l'App su App Store Connect
1. Vai su https://appstoreconnect.apple.com
2. Clicca **"My Apps"** → **"+"** → **"New App"**
3. Compila:
   - **Platform**: iOS
   - **Name**: Match Sport 24
   - **Primary Language**: Italian
   - **Bundle ID**: com.matchsport24.app
   - **SKU**: matchsport24-v1
4. Clicca **"Create"**

### 4.5 Completa le Informazioni App Store
Nella pagina dell'app, vai su **"App Store"** → **"App Information"** e compila:

**Informazioni Generali:**
- Categoria: Sports
- Sottocategoria: Social Networking
- Content Rights: Non usa contenuti di terze parti
- Age Rating: 4+

**Pricing:**
- Price: Free (Gratuito)

**Privacy:**
- Privacy Policy URL: (inserisci la tua URL)

**Screenshots (obbligatori):**
- iPhone 6.5" (1284 x 2778 px): 3-10 screenshot
- iPhone 5.5" (1242 x 2208 px): 3-10 screenshot
- iPad 12.9" (2048 x 2732 px): opzionale

### 4.6 Invia per Review
1. Vai su **"App Store"** → seleziona la tua build
2. Clicca **"Submit for Review"**
3. Rispondi alle domande di compliance
4. Attendi 1-7 giorni per la review

---

## PARTE 5: Build per Android (Play Store)

### 5.1 Crea il Build Android
```bash
eas build --platform android --profile production
```

- EAS creerà automaticamente le chiavi di firma
- Il build richiede circa 10-20 minuti
- Al termine, riceverai un link per scaricare il file `.aab`

### 5.2 Crea l'App su Google Play Console
1. Vai su https://play.google.com/console
2. Clicca **"Create app"**
3. Compila:
   - **App name**: Match Sport 24
   - **Default language**: Italian
   - **App or game**: App
   - **Free or paid**: Free
4. Accetta le policy e clicca **"Create app"**

### 5.3 Configura la Scheda Store
Vai su **"Grow"** → **"Store presence"** → **"Main store listing"**:

**Descrizione:**
- Short description: "Trova e prenota partite di Padel, Tennis, Calcetto e Calcio a 8!"
- Full description: (usa quella che ho creato in STORE_LISTING.md)

**Grafica:**
- App icon: 512x512 PNG (usa app-icon.png)
- Feature graphic: 1024x500 PNG (da creare)
- Screenshots: minimo 2, massimo 8 per tipo di dispositivo

### 5.4 Completa le Informazioni Obbligatorie
Vai su **"Policy"** → **"App content"** e compila TUTTO:

1. **Privacy policy**: inserisci URL
2. **Ads**: l'app non contiene pubblicità
3. **App access**: l'app è accessibile a tutti (con registrazione)
4. **Content ratings**: completa il questionario
5. **Target audience**: 18+ (o il tuo target)
6. **News apps**: No
7. **COVID-19 apps**: No
8. **Data safety**: compila il form sulla raccolta dati

### 5.5 Carica il Build
1. Vai su **"Release"** → **"Production"**
2. Clicca **"Create new release"**
3. Carica il file `.aab` scaricato da EAS
4. Aggiungi le note di rilascio: "Prima versione di Match Sport 24"
5. Clicca **"Save"** → **"Review release"** → **"Start rollout to Production"**

### 5.6 Sottometti per Review
- La review di Google richiede 1-3 giorni
- Riceverai email con lo stato

---

## PARTE 6: Comandi Rapidi Riassuntivi

```bash
# Setup iniziale (una volta sola)
cd match-sport-24/frontend
npm install
eas login
eas build:configure

# Build iOS
eas build --platform ios --profile production
eas submit --platform ios --latest

# Build Android
eas build --platform android --profile production
# Poi carica manualmente il .aab su Play Console

# Build entrambi insieme
eas build --platform all --profile production
```

---

## PARTE 7: Checklist Finale

### Per Apple App Store:
- [ ] Account Apple Developer attivo
- [ ] App creata su App Store Connect
- [ ] Build .ipa caricato
- [ ] Screenshot caricati
- [ ] Descrizione compilata
- [ ] Privacy Policy URL
- [ ] Sottomesso per review

### Per Google Play Store:
- [ ] Account Google Play Developer attivo
- [ ] App creata su Play Console
- [ ] Build .aab caricato
- [ ] Screenshot caricati
- [ ] Descrizione compilata
- [ ] Privacy Policy URL
- [ ] Data Safety compilato
- [ ] Content Rating completato
- [ ] Sottomesso per review

---

## 🆘 Problemi Comuni

### "Missing compliance information" (iOS)
→ Vai su App Store Connect → App → Compliance e rispondi alle domande sull'encryption

### "Bundle ID already exists" (iOS)
→ Usa un Bundle ID diverso (es. com.matchsport24.app.v2)

### "APK/AAB missing" (Android)
→ Assicurati di caricare il file .aab, non .apk per la produzione

### "Data Safety form incomplete" (Android)
→ Compila TUTTE le sezioni del form Data Safety, anche se non raccogli dati

---

## 📞 Supporto

- **Expo/EAS**: https://docs.expo.dev
- **Apple Developer**: https://developer.apple.com/support
- **Google Play**: https://support.google.com/googleplay/android-developer

---

**Tempo stimato totale: 2-4 ore di lavoro + 1-7 giorni di review**

Buona fortuna con il lancio! 🚀🎾

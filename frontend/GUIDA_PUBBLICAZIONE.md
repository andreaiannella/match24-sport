# 🚀 Guida Pubblicazione Match Sport 24

## Prerequisiti

### 1. Account Developer (OBBLIGATORIO)

**Apple Developer Program** - Per pubblicare su App Store
- Vai su: https://developer.apple.com/programs/
- Costo: $99/anno
- Tempo di approvazione: 24-48 ore
- Documenti richiesti: Carta d'identità, Dati aziendali (se applicabile)

**Google Play Developer** - Per pubblicare su Play Store  
- Vai su: https://play.google.com/console/signup
- Costo: $25 una tantum
- Tempo di approvazione: Immediato dopo il pagamento

---

## Passaggi per Pubblicare

### Step 1: Installa EAS CLI (sul tuo computer)
```bash
npm install -g eas-cli
eas login
```

### Step 2: Scarica il codice dell'app
- Usa l'opzione "Download" su Emergent per scaricare il progetto
- Oppure fai push su GitHub e clona il repository

### Step 3: Configura EAS
```bash
cd match-sport-24/frontend
eas build:configure
```

### Step 4: Build per iOS
```bash
# Build di sviluppo (per testare)
eas build --platform ios --profile preview

# Build di produzione (per App Store)
eas build --platform ios --profile production
```

### Step 5: Build per Android
```bash
# Build APK (per testare)
eas build --platform android --profile preview

# Build AAB (per Play Store)
eas build --platform android --profile production
```

### Step 6: Sottometti agli Store

**Per iOS:**
```bash
eas submit --platform ios
```
Oppure carica manualmente tramite Transporter o App Store Connect.

**Per Android:**
```bash
eas submit --platform android
```
Oppure carica manualmente il file .aab su Google Play Console.

---

## Checklist Pre-Pubblicazione

### ✅ Asset Grafici
- [x] Icona app 1024x1024 PNG (app-icon.png)
- [x] Splash screen configurato
- [ ] Screenshot per store (6 per piattaforma)
- [ ] Video preview (opzionale)

### ✅ Informazioni App
- [x] Nome: Match Sport 24
- [x] Bundle ID: com.matchsport24.app
- [x] Descrizione breve
- [x] Descrizione lunga
- [ ] Privacy Policy URL
- [ ] Terms of Service URL

### ✅ Configurazione Tecnica
- [x] app.json configurato
- [x] eas.json configurato
- [x] Permessi iOS dichiarati
- [x] Permessi Android dichiarati

---

## Timeline Stimata

| Fase | Tempo |
|------|-------|
| Registrazione Apple Developer | 1-2 giorni |
| Registrazione Google Play | Immediato |
| Build con EAS | 15-30 minuti |
| Review Apple | 1-7 giorni |
| Review Google | 1-3 giorni |

**Tempo totale: circa 1-2 settimane**

---

## Costi

| Voce | Costo |
|------|-------|
| Apple Developer Program | $99/anno |
| Google Play Developer | $25 (una tantum) |
| EAS Build (gratuito) | $0 (fino a 30 build/mese) |
| **Totale primo anno** | **~$124** |

---

## Supporto

Per domande sulla pubblicazione:
- Documentazione Expo EAS: https://docs.expo.dev/submit/introduction/
- Apple Developer Support: https://developer.apple.com/support/
- Google Play Help: https://support.google.com/googleplay/android-developer/

---

## Note Importanti

1. **Privacy Policy**: Prima di pubblicare, crea una pagina privacy policy per la tua app
2. **Backend**: Assicurati che il backend sia hostato su un server pubblico (non localhost)
3. **Stripe**: Usa le chiavi LIVE di Stripe per la produzione
4. **Test**: Testa l'app su dispositivi reali prima di sottomettere

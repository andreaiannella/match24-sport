# Setup build via GitHub Actions

I workflow `.github/workflows/build-ios.yml` e `build-android.yml` sostituiscono
`eas build`, ma per firmare l'app allo stesso modo delle build precedenti
(obbligatorio: l'app è già pubblicata su entrambi gli store) servono le stesse
credenziali che EAS ha sempre gestito per te. Vanno recuperate una volta e
caricate come Secret di questo repository.

## 1. Recupera le credenziali da EAS

Sul tuo computer, dentro `frontend/`:
```bash
npm install -g eas-cli
eas login
eas credentials
```
Il comando apre un menu interattivo: scegli la piattaforma (iOS o Android),
poi l'opzione per vedere/scaricare le credenziali esistenti.

**Android** → scarica il file `.jks`/`.keystore` e annota alias e password
(EAS te li mostra nello stesso menu).

**iOS** → scarica il certificato di distribuzione (`.p12`, con la sua
password) e il provisioning profile (`.mobileprovision`).

## 2. Converti i file in base64

```bash
base64 -i il-tuo-file.keystore | tr -d '\n' > keystore.base64.txt
base64 -i il-tuo-certificato.p12 | tr -d '\n' > cert.base64.txt
base64 -i il-tuo-profilo.mobileprovision | tr -d '\n' > profile.base64.txt
```

## 3. Crea una API Key di App Store Connect

Su [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → **Users
and Access** → **Integrations** → **Keys** → **+** per crearne una nuova,
ruolo "App Manager" basta. Scarica il file `.p8` (si può scaricare **una sola
volta**), annota il Key ID e l'Issuer ID mostrati nella stessa pagina.

```bash
base64 -i AuthKey_XXXXXXXXXX.p8 | tr -d '\n' > apikey.base64.txt
```

## 4. Carica tutto come Secret del repository

Su GitHub: **Settings** del repo → **Secrets and variables** → **Actions** →
**New repository secret**, uno per ciascuno:

| Nome | Valore |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | contenuto di `keystore.base64.txt` |
| `ANDROID_KEYSTORE_PASSWORD` | password del keystore (da `eas credentials`) |
| `ANDROID_KEY_ALIAS` | alias della chiave (da `eas credentials`) |
| `ANDROID_KEY_PASSWORD` | password della chiave (spesso uguale a quella del keystore) |
| `IOS_CERTIFICATE_BASE64` | contenuto di `cert.base64.txt` |
| `IOS_CERTIFICATE_PASSWORD` | password del certificato `.p12` |
| `IOS_PROVISIONING_PROFILE_BASE64` | contenuto di `profile.base64.txt` |
| `APPLE_TEAM_ID` | `584VX3RB4D` |
| `APP_STORE_CONNECT_KEY_ID` | Key ID della API Key creata al punto 3 |
| `APP_STORE_CONNECT_ISSUER_ID` | Issuer ID mostrato nella stessa pagina |
| `APP_STORE_CONNECT_API_KEY_BASE64` | contenuto di `apikey.base64.txt` |

Nella stessa scheda, sotto **Variables** (non Secrets, questo non è sensibile),
aggiungi anche:

| Nome | Valore |
|---|---|
| `EXPO_PUBLIC_BACKEND_URL` | l'URL del backend live (es. quello di Railway/Render una volta pronto) |

## 5. Avvia una build

Scheda **Actions** del repo → scegli "Build iOS App" o "Build Android App" →
**Run workflow**. La build iOS richiede un runner macOS (più lenta, ~20-30
min); quella Android gira su Linux (~10-15 min). L'iOS carica automaticamente
su App Store Connect/TestFlight a fine build; l'Android produce un `.aab`
scaricabile dalla pagina del workflow, da caricare a mano su Play Console.

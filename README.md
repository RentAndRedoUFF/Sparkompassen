# MittCSN

MittCSN är ett skolprojekt i Teknikspecialisering för att förklara studieskuld, ränta och återbetalning.

## Kom igång

```bash
npm install
npm test
npm run dev
```

Öppna http://localhost:3000. Tre sidor finns nu:

- **Hem** (`/`) – varför tjänsten finns, statistik och förklaringar.
- **Kalkylator** (`/calculator.html`) – förenklad annuitetsmodell med extra betalningar, räntejämförelser och CSV-export.
- **Mina sidor** (`/account.html`) – kontoinställningar, namngivning och jämförelse av sparade beräkningar, utloggning och kontoradering.

Studieguiden fungerar direkt. Valfria AI-svar kan aktiveras i Vercel.

`backend/data/` innehåller lokalt sparade konton och är exkluderad via `.gitignore`. Lägg aldrig upp `.env`, API-nycklar eller användarkontodata på GitHub.

Se `SPRINT_4.md` för tekniska detaljer, viktiga modellbegränsningar och källor.

## Viktigt: öppna webbappen via Node-servern

Starta från projektmappen med `npm install` följt av `npm run dev`. Öppna sedan **http://localhost:3000** (inte `public/index.html` direkt och inte VS Code Live Server på port 5500). Inloggningen är en riktig lokal serverfunktion, inte en offline-demo. HTML-länkarna har också gjorts relativa för att navigeringen ska fungera när projektet ligger i en undermapp.

### Testa inloggningen

1. Öppna **Mina sidor → Skapa konto**. Välj en testadress och ett nytt lösenord på minst 12 tecken.
2. Spara ett beräkningsexempel från **Kalkylator**. Om du inte loggat in först kommer du till Mina sidor och exemplet sparas efter inloggning.
3. Logga ut och logga in igen med samma testkonto. Dina sparade beräkningar ska fortfarande synas.
4. Testa även menyn på en smal mobilskärm med knappen **Öppna menyn**.

Använd en testadress och fiktiva belopp vid provning. MittCSN har ingen koppling till CSN eller BankID.

## Driftsättning på Vercel

1. Importera GitHub-repot med projektroten som **Root Directory**. Projektet har en Express-konfiguration i `vercel.json`.
2. Anslut en PostgreSQL-databas, till exempel Neon. I **Settings → Environment Variables** lägger du in den poolade anslutningssträngen som `DATABASE_URL` för **Production**. Behåll databasleverantörens TLS-inställningar i anslutningssträngen.
3. Välj **Redeploy** efter att du lagt till variabeln. MittCSN skapar sina tre tabeller vid det första databasanslutna anropet. Databasanvändaren behöver därför kunna skapa tabeller och index.
4. Öppna **Mina sidor** och skapa ett konto med en testadress. Prova att spara en beräkning, ändra visningsnamnet, logga ut och logga in igen.

Vercel använder `app.js` för API:t och `public/` för HTML, CSS och JavaScript. Kalkylatorn fungerar utan databas. Vercel använder `DATABASE_URL` i första hand och `POSTGRES_URL` om den första variabeln saknas. Utan en anslutningssträng visar webbversionen ett meddelande om att konton är avstängda. Lägg anslutningssträngen i Vercel eller i den lokala `.env`-filen. GitHub-repot är offentligt.

### Lagring och testning

- Utan `DATABASE_URL` använder `npm run dev` ditt befintliga lokala register i `backend/data/accounts.json`. Det lokala registret och konton på Vercel har separat historik.
- Med PostgreSQL ligger konton, historik och sessioner kvar mellan webbinstanser och omstarter. Lösenord hashas med scrypt och sessioner använder HttpOnly-cookies. Lösenordsbyte loggar ut övriga sessioner.
- Kör `npm run check` och `npm test` lokalt. För att även köra PostgreSQL-testet, sätt `MITTCSN_TEST_DATABASE_URL` till anslutningssträngen för en separat testdatabas. Testet skapar fiktiva konton.

## Aktivera verifierings- och återställningsmejl

1. Skapa en **Email Service** och en **Email Template** i [EmailJS](https://dashboard.emailjs.com/).
2. Kopiera [HTML-mallen för kontomejl](templates/emailjs-account.html) till mallens HTML-redigerare. Sätt **To Email** till `{{to_email}}` och **Subject** till `{{subject}}`. Använd en fast avsändare från din anslutna e-posttjänst. Samma mall används för verifiering och återställning. Om du vill ha ett textmejl kan du använda `{{message}}` som innehåll.
3. I **Account → Security** aktiverar du API-anrop från serverapplikationer. Kopiera mallens och tjänstens ID samt den publika och den privata nyckeln till Vercel. [EmailJS om serveranrop](https://github.com/emailjs-com/emailjs-nodejs)
4. Lägg in följande miljövariabler i Vercel för **Production**. Markera den privata nyckeln som känslig och välj sedan **Redeploy**.

   | Variabel | Värde |
   | --- | --- |
   | `EMAILJS_SERVICE_ID` | ID för den anslutna e-posttjänsten |
   | `EMAILJS_TEMPLATE_ID` | ID för e-postmallen |
   | `EMAILJS_PUBLIC_KEY` | EmailJS Public Key |
   | `EMAILJS_PRIVATE_KEY` | EmailJS Private Key |
   | `MITTCSN_BASE_URL` | Sidans publika HTTPS-adress, till exempel `https://mittcsn.se` |

Servern använder EmailJS när alla fyra EmailJS-variabler och den publika adressen finns. En befintlig Resend-konfiguration med `RESEND_API_KEY`, `MITTCSN_EMAIL_FROM` och `MITTCSN_BASE_URL` fortsätter fungera om EmailJS saknas.

Befintliga användare kan skicka en verifieringslänk via **Mina sidor → Kontoinställningar**. Nya användare får ett verifieringsmejl vid registrering. E-postverifiering behövs för **Glömt lösenord**. Länkarna kan användas en gång och gäller i 24 timmar för verifiering och 30 minuter för återställning.

Kontoradering kräver lösenord och uttrycklig bekräftelse. Åtgärden tar bort kontot och de sparade beräkningarna från den aktiva databasen och loggar ut samtliga sessioner.

## Studieguide och AI-chatt

Guiden använder `/api/chat` och kan svara på vanliga frågor om kalkylatorn direkt. Vill du aktivera AI-svar, lägg till `OPENAI_API_KEY` som en känslig variabel för **Production** och välj **Redeploy**. Modellen kan ställas in med `OPENAI_CHAT_MODEL` och är som standard `gpt-4.1-mini`.

AI är frivilligt för besökaren. Servern skickar den aktuella frågan till OpenAI när besökaren väljer ett AI-svar. Den skickar ingen tidigare konversation eller kontoprofil. I webbversionen begränsar PostgreSQL AI-anropen till fem per 15 minuter per IP-adress och högst 50 per dygn totalt. Om modellens svar saknas eller gränsen nås visas ett guidesvar.

## Årsavgift i kalkylatorn

Modellen lägger en valfri årsavgift på varje påbörjat betalningsår, även sista året om lånet löses tidigare. Det planerade beloppet per betalning visas före avgifter. Totalsummor, årsöversikt, sparad historik och CSV tar med avgiften. För beräkningar som sparats före uppdateringen används 0 kr i årsavgift.

## Sprint 4.2 – Professionell vidareutveckling

- Startsida: genomarbetad presentation, interaktiva startscenarier, källbelagd CSN-information och vanliga frågor.
- Kalkylator: separata sidor, snabbval av lånebelopp, förenklad annuitetsberäkning, skuldbana, jämförelse av återbetalningstid, årsöversikt, CSV-export och kopierbar sammanfattning.
- Mina sidor: registrering, inloggning, utloggning, privat historik, återanvända tidigare beräkning och ta bort en egen sparad beräkning.
- Hjälpguide: korta standardsvar och snabbfrågor. **Ingen AI-integration ännu.**
- Varningsbanderollen för öppnad HTML-fil är borttagen och har ersatts med diskreta felmeddelanden endast när ett API-anrop misslyckas.

### Viktigt om modellen

Alla amorterings- och jämförelseberäkningar är **illustrativa**, inte en simulering av CSN:s verkliga återbetalningsregler. CSN:s ränta är rörlig, dag-för-dag-beräknad och det kan tillkomma avgifter och särskilda årsbeloppsregler. Kontrollera alltid uppgifter hos CSN.

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
- **Mina sidor** (`/account.html`) – registrering, inloggning, sparade beräkningar, kontoinställningar och utloggning.

Den lilla frågeguiden är **inte AI**. Riktig AI-integration tillkommer senare.

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
- E-postadressen används för att logga in. E-postverifiering och lösenordsåterställning via e-post ingår ännu inte.
- Kör `npm run check` och `npm test` lokalt. För att även köra PostgreSQL-testet, sätt `MITTCSN_TEST_DATABASE_URL` till anslutningssträngen för en separat testdatabas. Testet skapar fiktiva konton.

## Sprint 4.2 – Professionell vidareutveckling

- Startsida: genomarbetad presentation, interaktiva startscenarier, källbelagd CSN-information och vanliga frågor.
- Kalkylator: separata sidor, snabbval av lånebelopp, förenklad annuitetsberäkning, skuldbana, jämförelse av återbetalningstid, årsöversikt, CSV-export och kopierbar sammanfattning.
- Mina sidor: registrering, inloggning, utloggning, privat historik, återanvända tidigare beräkning och ta bort en egen sparad beräkning.
- Hjälpguide: korta standardsvar och snabbfrågor. **Ingen AI-integration ännu.**
- Varningsbanderollen för öppnad HTML-fil är borttagen och har ersatts med diskreta felmeddelanden endast när ett API-anrop misslyckas.

### Viktigt om modellen

Alla amorterings- och jämförelseberäkningar är **illustrativa**, inte en simulering av CSN:s verkliga återbetalningsregler. CSN:s ränta är rörlig, dag-för-dag-beräknad och det kan tillkomma avgifter och särskilda årsbeloppsregler. Kontrollera alltid uppgifter hos CSN.

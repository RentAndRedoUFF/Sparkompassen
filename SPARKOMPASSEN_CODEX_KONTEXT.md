# MittCSN – projektkontext för Codex

> Detta är en överlämningssammanfattning av projektarbetet i ChatGPT, inte en fullständig export av gamla chattmeddelanden. **Koden i projektmappen är den faktiska källan till sanning**. Kontrollera alltid filer och tester innan du ändrar något.

## Projektets syfte

MittCSN är ett svenskt gymnasieprojekt i Teknikspecialisering för att hjälpa studenter förstå studieskuld, ränta och återbetalning. Projektet är **en pedagogisk prototyp**, inte en bank, CSN-tjänst eller personlig finansiell rådgivare. Kommunicera detta tydligt i UI.

- Språk i webbappen, dokumentation och användarflöden: **svenska**.
- Mål: **hög teknisk kvalitet (A-nivå)**, tillgänglig, modern, professionell och mänskligt genomarbetad nordisk finansdesign. Ta inspiration från tydlig hierarki hos bankwebbplatser men kopiera inte deras varumärke, design eller text.
- Fokus: ren kod, säkerhet, tydliga felmeddelanden, responsiv layout, testbarhet, konsekvent UI.

## Aktuell kodbas

Utgå från **`sparkompassen-sprint-4-premium.zip`**, version **0.4.2**. ZIP-filen innehåller projektmappen `sparkompassen-start` med `README.md`, `package.json`, `frontend/`, `backend/` och sprintrapporter. När projektmappen är öppnad i VS Code kan Codex läsa filerna direkt, utan att en ZIP laddas upp i chatten.

### Teknikstack

- Frontend: **HTML, CSS och vanilla JavaScript**.
- Backend: **Node.js >=20, Express 5, Helmet, dotenv**.
- Konto- och sessionshantering sker på servern. Lösenord hashkodas med **scrypt** och sessionsidentifierare används med HttpOnly-cookie.
- Konton och sparad historik lagras **lokalt i JSON** (under `backend/data/`) i Sprint 4. Ingen färdig SQLite-migrering ännu.
- Beräkningsmodellen är en **förenklad annuitetsmodell**. Inte samma sak som en officiell CSN-betalningsplan.
- Automatisk testning: Node.js inbyggda testverktyg (`node --test`).

### Viktiga sidor

- `frontend/index.html` – startsida med projektpresentation, CSN-relaterad information och vägval.
- `frontend/calculator.html` – separat kalkylator och resultatöversikt.
- `frontend/account.html` – testkonto, registrering, inloggning, Mina sidor, historik och utloggning.
- `frontend/app.js`, `validation.js`, `presentation.js`, `insights.js`, `styles.css` – frontendlogik, validering, presentation och design.
- `backend/app.js`, `server.js`, `calculator.js`, `storage.js` – API, server, beräkningar och lokal datalagring.

### Köra lokalt

```sh
npm install
npm run check
npm test
npm run dev
```

Öppna `http://localhost:3000`. **Dubbelklicka inte på HTML-filerna och använd inte Live Server i stället för Node-servern**, eftersom API och inloggning kräver backend.

## Genomförda sprintar

### Sprint 1 – Teknisk grund

- Semantisk HTML5, CSS3, JavaScript, mobilanpassning och grundnavigation.
- Node.js/Express-server, Helmet-säkerhetsheaders, `.env.example` och `.gitignore`.
- Tre ursprungliga tester (hälsokontroll, 404 och startsida).

### Sprint 2 – Inmatning och validering

- CSN-formulär för studieskuld, ränta, återbetalningstid och betalningsintervall.
- JS-validering av tomma/negativa/ogiltiga värden och definierade gränser.
- Fältspecifika felmeddelanden.
- Totalt 11 automatiska tester rapporterades som godkända lokalt.

### Sprint 3 – Resultatöversikt

- Svenska tusentalsavgränsare (ex. `10 000 000 kr`), tydligare felmeddelanden.
- Fyra informationskort och responsiv resultatöversikt.
- Tydlig märkning av exempelvärden och skillnad mellan inmatade värden och beräkningar.
- 16 automatiska tester rapporterades som godkända lokalt.

### Sprint 4 – Större ombyggnad, version 0.4.2

- Professionell startsida med mål, användarflöde och källbelagd information.
- Separat kalkylatorsida med **illustrativ** annuitetsmodell, jämförelse av återbetalningstid, skuldutveckling, årsöversikt, CSV-export och kopierbar sammanfattning.
- Registrering, inloggning, utloggning, Mina sidor, sparade beräkningar, återanvändning och borttagning av **egna** sparade beräkningar.
- Mobilnavigation och länkar som fungerar i appens routing.
- Regelbaserad hjälpguide med standardsvar; **ingen AI-modell är integrerad ännu**.
- Enligt senaste utvecklingsrapporten passerade 29 fristående tester. Serverberoende tester måste verifieras lokalt genom `npm test`; utgå inte från att allt är säkert eller produktionsklart.

## Aktuell plan – Sprint 5 (förslag, 12 timmar)

1. WBS 1.4.1: Konfigurera SQLite-databas – 3 h.
2. WBS 1.4.2: Migrera testkonton och beräkningshistorik från lokal JSON till SQLite – 3 h.
3. Förbättra sessions- och behörighetskontroller – 2 h.
4. Tillgänglighet, responsivitet och manuella användartester – 2 h.
5. Databastester, felsökning och teknisk dokumentation – 2 h.

Prioritera **migrering utan dataförlust** i lokala testmiljöer. Inga förändringar ska göras direkt på användares verkliga data. Kör och dokumentera tester före/efter ändringar och skriv en begriplig Sprint Review enligt projektmallen.

## Projektregler och avgränsningar

- Inga riktiga personuppgifter, riktiga lösenord eller privata studieskulduppgifter i GitHub. Testkonton ska vara fiktiva.
- Lägg aldrig upp `.env`, API-nycklar, `node_modules`, `backend/data` eller någon annan lokal kontodatabas i Git. Kontrollera `.gitignore` och git-status inför varje commit.
- Kontrollera säkerheten i autentisering, auktorisering, sessionscookies, CSRF-risker, inmatningsvalidering och felhantering inför eventuell offentlig driftsättning.
- Märk kalkylatorns beräkningar som **förenklade antaganden**; efterlikna inte CSN:s officiella återbetalningsregler utan särskild verifiering.
- Faktapåståenden på startsidan ska ha korrekta och aktuella källor. Ange exakt vad statistiken gäller; påstå inte att den avser unga om källan handlar om alla låntagare.
- Riktig AI-integration ska i framtiden ske **server-side**, med säkert hanterad API-nyckel, tydlig information om begränsningar och lämplig dataminimering.
- Ändra inte funktioner som redan fungerar utan att ha en tydlig orsak. Gör så små, testbara commits som möjligt.
- Var tydlig med vad som faktiskt är implementerat/testat och vad som endast är planerat.

## GitHub och fortsatt arbete

Repository: `https://github.com/RentAndRedoUFF/Sparkompassen`

Den aktuella koden finns på grenen `main`. Använd GitHub-repot som utgångspunkt för fortsatt arbete.

## Första uppdraget till Codex

1. Läs `README.md`, `package.json`, dokumentationen och alla relevanta källfiler.
2. Kör `npm install`, `npm run check` och `npm test` i projektmappen.
3. Ge en kort statusrapport över faktisk funktionalitet, testresultat, kodrisker och förslag på förbättringar.
4. Föreslå en säker och realistisk Sprint 5-implementering med SQLite, servervalidering och kontohantering.
5. Gör endast ändringar som jag uttryckligen ber om, och redovisa varje fil som ändras.

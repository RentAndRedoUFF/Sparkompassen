# MittCSN – Sprint 4

MittCSN är ett skolprojekt i Teknikspecialisering för att förklara studieskuld, ränta och återbetalning.

## Kom igång

```bash
npm install
npm test
npm run dev
```

Öppna http://localhost:3000. Tre sidor finns nu:

- **Hem** (`/`) – varför tjänsten finns, statistik och förklaringar.
- **Kalkylator** (`/calculator.html`) – pedagogisk, förenklad annuitetsmodell.
- **Mina sidor** (`/account.html`) – registrering, inloggning, sparade beräkningar, utloggning.

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

Lagra inte riktiga personuppgifter i skolprototypen. Ingen BankID-integration finns. Konton finns lokalt på den dator där servern körs, inte på någon offentlig tjänst.

## Sprint 4.2 – Professionell vidareutveckling

- Startsida: genomarbetad presentation, interaktiva startscenarier, källbelagd CSN-information och vanliga frågor.
- Kalkylator: separata sidor, snabbval av lånebelopp, förenklad annuitetsberäkning, skuldbana, jämförelse av återbetalningstid, årsöversikt, CSV-export och kopierbar sammanfattning.
- Mina sidor: registrering, inloggning, utloggning, privat historik, återanvända tidigare beräkning och ta bort en egen sparad beräkning.
- Hjälpguide: korta standardsvar och snabbfrågor. **Ingen AI-integration ännu.**
- Varningsbanderollen för öppnad HTML-fil är borttagen och har ersatts med diskreta felmeddelanden endast när ett API-anrop misslyckas.

### Viktigt om modellen

Alla amorterings- och jämförelseberäkningar är **illustrativa**, inte en simulering av CSN:s verkliga återbetalningsregler. CSN:s ränta är rörlig, dag-för-dag-beräknad och det kan tillkomma avgifter och särskilda årsbeloppsregler. Kontrollera alltid uppgifter hos CSN.

### Säkerhet och begränsningar

Kontouppgifter lagras i ett lokalt JSON-register i `backend/data` som inte ska versionshanteras. Lösenord hashkodas med `scrypt`, och sessionsidentifieraren finns i en HttpOnly-cookie. Inloggning är byggd för ett lokalt skolprojekt, **inte** för en publik produktionstjänst. Använd testkonton utan riktiga personuppgifter. Inför extern drift behöver databashantering, sessioner, dataskydd, behörighetstester, tillgänglighet och säkerhetsgranskning förstärkas.

### Testning

Kör `npm install`, `npm run check` och `npm test`. Tester omfattar bland annat kalkylatorns matematik, jämförelser, layoutintegration och serverflöden (inklusive borttagning av egna sparade beräkningar). Full API-testning kräver att Express och Helmet är installerade.

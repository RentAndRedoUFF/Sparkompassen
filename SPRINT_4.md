# Sprint 4 – Stor ombyggnad av Sparkompassen

## Levererat i denna version

- **Ny startsida:** syfte, problemformulering, CSN-statistik, tydlig källänk, tre steg och nytt designsystem inspirerat av bankwebbplatsers informationshierarki men med eget innehåll och eget utseende.
- **Separat kalkylator:** `/calculator.html`, formulär och enkel annuitetsberäkning via `POST /api/calculate`. Visar ungefärlig betalning, total ränta, totalsumma och antal betalningar.
- **Konto:** `/account.html`, registrering/inloggning/utloggning, hashade lösenord med `scrypt`, HttpOnly-sessioncookie. Sparade exempel visas med senaste först, upp till 20 per konto.
- **Lagrad historik:** JSON-fil i `backend/data/accounts.json` (ignoreras av Git). Endast aktiva konton får spara och läsa sin historik.
- **Liten guide:** förinställda frågor och svar om CSN, ränta och sparade beräkningar. Ingen AI-API-nyckel eller påhittad AI-integration.
- **Tester:** 4 nya enhetstester för kalkylatorn samt 3 nya API-/kontotester. Kör hela sviten med `npm test`.

## Viktig skillnad mellan en modell och CSN

`/api/calculate` använder en **förenklad annuitetsmodell** där räntan antas oförändrad, betalningarna lika stora och ränta fördelas per betalningsperiod. CSN använder särskilda återbetalningsregler (bl.a. årligt fastställd ränta och årsbelopp) och modellen får **inte** presenteras som en officiell CSN-prognos.

## Källor för hemsidans fakta

- CSN (2026-04-15): ungefär 6 % av cirka 1,5 miljoner återbetalningsskyldiga låntagare får en skuld överlämnad till Kronofogden varje år: https://www.csn.se/om-csn/press/pressmeddelanden/2026-04-15-tre-av-fyra-som-far-studieskulder-skickade-till-kronofogden-ar-redan-skuldsatta.html
- CSN: ränta för studielån 2026 är 2,135 %: https://www.csn.se/betala-tillbaka/betala-tillbaka-studielan/ranta-och-avgifter.html

Siffrorna gäller inte specifikt unga. De får aldrig återges som en andel unga som hamnar i skuld.

## Säkerhet och avgränsning

Detta är en **skolprototyp**, inte en produktionsklar inloggningstjänst. Kontodata lagras lokalt i en serverfil (med hashade lösenord); sessionsdata ligger i serverminnet och försvinner när servern startar om. HTTPS bör användas om projektet publiceras. Innan riktiga användare får skapa konton behöver systemet bl.a. databasmigrering till SQLite, säkrare sessionslagring, enhets- och säkerhetstester, återställning av lösenord, dataradering och en integritetsbedömning.

Spara inte personnummer, officiella CSN-inloggningsuppgifter eller andra känsliga uppgifter.

## Start

1. Öppna projektmappen i VS Code.
2. Kör `npm install`.
3. Kör `npm test`.
4. Kör `npm run dev`.
5. Öppna http://localhost:3000 och testa startsida, kalkylator och Mina sidor.

Skriv inte in någon verklig API-nyckel i frontend. Framtida AI-integration ska göras på servern med miljövariabler.

## Sprint Review – version 0.4.2

### Syfte

Bygga vidare på resultatvyn från Sprint 3 så att användaren kan räkna på ett studielån, jämföra återbetalningstider och spara egna exempel.

### Genomfört i koden

1. **Startsida:** Källbelagd information om studielån, vanliga frågor och snabbvägar till kalkylatorn.
2. **Kalkylator:** Förenklad annuitetsberäkning med skuldgraf, jämförelse av återbetalningstider och årsöversikt som kan exporteras till CSV.
3. **Mina sidor:** Testkonton med inloggning och möjlighet att spara, återanvända och ta bort egna beräkningar. Historiken lagras lokalt i JSON.
4. **Hjälpguide:** Förinställda svar om ränta, beräkningar och konton. Webbappen heter nu MittCSN.

### Testning och nästa steg

- `npm run check` godkändes och alla 37 automatiska tester passerade vid kontrollen den 26 november 2026. Testerna täcker bland annat beräkningar, validering och kontoflöden.
- Manuella kontroller av mobilvyn och CSV-exporten återstår att dokumentera. Faktisk tidsåtgång framgår inte av projektunderlaget.
- Inför Sprint 5 är den föreslagna fortsättningen att flytta testkonton och beräkningshistorik till SQLite och förbättra sessions- och behörighetskontrollerna.

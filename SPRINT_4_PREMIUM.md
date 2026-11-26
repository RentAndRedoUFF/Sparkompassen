# Sprint 4.2 – Design, analys och förbättringar

## Genomförda delar

1. **Startsida**: ny professionell formulering, tydliga handlingsknappar, referenser från CSN, kunskapskort, FAQ och länkade startscenarier.
2. **Kalkylator**: snabbval, förbättrad resultatvy, SVG-graf över illustrativ återstående skuld, jämförelse av löptider och årsöversikt.
3. **Verktyg**: svensk CSV-export och kopiera sammanfattning.
4. **Kontosystem**: återanvänd tidigare värden och radera enskild sparad beräkning från sitt eget konto.
5. **Användbarhet**: tillgängliga knappar, mobilanpassade layouter, responsiva tabeller, utfällbara vanliga frågor och en enkel chattguide med snabbförslag.
6. **Städning**: tagit bort den tidigare påträngande varningsbanderollen samt ersatt startsidans generiska etikett.

## Tekniska val

- Behåll HTML/CSS/JavaScript och Node/Express för spårbarhet och enkel underhållbarhet.
- Ny ren funktionell modul `frontend/insights.js` för årstabell och jämförelselogik, så att kalkylatorn kan enhetstestas separat.
- Tabeller genereras med DOM-API, inte med rå HTML från användarinput.
- API `DELETE /api/history/:id` kontrollerar session och att beräkningen ägs av den inloggade användaren.
- Ingen verklig AI-integrering eller kontokoppling till CSN/BankID.

## Verifierade källor (24 november 2026)

- CSN, 15 april 2026, *Tre av fyra som får studieskulder skickade till Kronofogden är redan skuldsatta*:
  https://www.csn.se/om-csn/press/pressmeddelanden/2026-04-15-tre-av-fyra-som-far-studieskulder-skickade-till-kronofogden-ar-redan-skuldsatta.html
- CSN, *Ränta och avgifter för studielån*: https://www.csn.se/betala-tillbaka/betala-tillbaka-studielan/ranta-och-avgifter.html

Statistiken gäller återbetalningsskyldiga låntagare i alla åldrar, inte specifikt unga.

## Teststatus

- 29 fristående tester klarar sig utan externa npm-paket och passerade vid utvecklingen.
- Två serverberoende testfiler kräver npm-paketen Express/Helmet och behöver köras genom `npm install && npm test` i VS Code.
- Webbläsarens grafiska provning kunde inte slutföras i utvecklingsmiljön på grund av lokal browserbegränsning. Testa därför navigation, registrering, sparande, radering och mobilvy lokalt.

## Definition of Done inför flytt till Complete

- [ ] `npm test` visar 0 misslyckade tester
- [ ] Navigering fungerar på dator och mobil
- [ ] Kalkylatorn visar tabell och diagram för olika belopp och räntor
- [ ] CSV-export fungerar
- [ ] Skapa konto → logga ut → logga in fungerar
- [ ] Spara → återanvänd → radera beräkning fungerar
- [ ] Alla skärmbilder och avvikelser är dokumenterade

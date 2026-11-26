# Sprint 3 – dokumentation och verifiering

## Syfte

Utveckla WBS 1.2.3:s första användargränssnitt för resultat utan att påstå att CSN:s återbetalning är beräknad. Förbättra feltext, visuell tydlighet och testbarhet.

## Genomfört i koden

1. **Beloppsformatering (2 h planerat):** Felmeddelanden visar svenska tusentalsgrupper och enheter, exempelvis `10 000 000 kr`. Intern validering och gränser är oförändrade.
2. **Resultatsidans layout (3 h planerat):** Ny responsiv sektion med fyra nyckeltalskort.
3. **Nyckeltal (3 h planerat):** Skuld, ränta, scenarioår och visningsintervall visas enhetligt. Inga räntekostnader eller betalningsbelopp uppfinns.
4. **Dataflöde (2 h planerat):** `frontend/presentation.js` är ren och testbar. Resultatsektionen visar tydligt märkta exempelvärden till dess användaren har lämnat giltiga indata. Vid ändring återgår den till exempeldata.
5. **Testning (2 h planerat):** Fem nya automatiska tester för talformat, intervall och säker validering. Manuella tillgänglighets- och mobila tester måste genomföras lokalt innan sprintens Definition of Done godkänns.

## Testguide

Kör `npm install`, `npm run check`, `npm test`, `npm run dev`.

Manuella kontroller att dokumentera:

- Fyll i 250000, 2.135, 20, välj kvartal och skicka. Kontrollera att översiktens etikett byter till 'Dina inmatade uppgifter' och visar `250 000 kr`.
- Ändra en siffra. Översikten ska återgå till tydligt märkta exempelvärden, så inga gamla resultat kan misstas för aktuella uppgifter.
- Prova studieskuld 10000001. Feltexten ska innehålla `10 000 000 kr`.
- Kontrollera 375 px och 1280 px bredd, Tab/Shift+Tab och fokussynlighet.
- Kontrollera att inga årsbelopp eller CSN-betalningsplaner visas som faktiska beräkningar.

## Avgränsningar och motivering

Ingen amorteringsalgoritm, skuldprognos eller AI kopplas på. CSN:s årsbelopp följer särskilda regler; det vore missvisande att presentera en vanlig annuitetskalkyl som officiellt CSN-resultat. Inga inmatade värden sparas eller skickas till servern i denna prototyp.

## Spårbarhet

WBS 1.2.3: responsiv resultatvy och nyckeltal. WBS 1.5.1 kvarstår för verifierad beräkningsmotor. Under Sprint Review: jämför planerad tid (12 h) med faktiskt loggade timmar, och dokumentera manuella testresultat.

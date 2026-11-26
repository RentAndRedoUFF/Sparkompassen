# Sprint 4 – Meny och inloggning (reparation)

## Åtgärder

- Menylänkarna för Hem, Kalkylator, Så fungerar det och Mina sidor har bytts från absoluta till relativa webbadresser.
- Mobilmenyn har en riktig öppna/stäng-knapp samt tangentbordsstöd.
- Projektet visar ett tydligt meddelande om HTML-filerna öppnas direkt eller om en annan lokal server används. Konto och beräkning kräver `npm run dev` och `http://localhost:3000`.
- Kontosidan har förbättrats med tydliga flikar, lösenordsbekräftelse och visa/dölj-lösenord.
- När någon vill spara en beräkning utan inloggning får personen öppna Mina sidor; exemplet sparas efter lyckad inloggning.
- Mina sidor visar antal sparade beräkningar och senaste datum. Utloggning leder tillbaka till inloggningsformuläret.
- Fler tester har lagts till för meny, sidor och kontoseparation.

## Felsökning för utvecklare

1. Packa upp hela ZIP-filen (öppna inte HTML direkt ur ZIP).
2. Öppna `sparkompassen-start` i Visual Studio Code.
3. `npm install`
4. `npm run dev`
5. Öppna **http://localhost:3000** (ingen Live Server på port 5500).
6. Skapa ett *testkonto* via Mina sidor med minst 12 tecken i lösenordet. Kontot är lokalt på datorn och är **inte** anslutet till BankID eller CSN.
7. Prova att göra en beräkning, spara den, logga ut och logga in igen.
8. Kör `npm test` för full svit. Kontotesterna kräver installerade Express/Helmet-paket.

## Begränsningar

- För privat skolprototyp, inte produktion. Systemet har inga funktioner för återställning av lösenord, e-postverifiering eller kontoägarskapskontroll.
- Sessionerna ligger i serverminnet och loggas därför ut när serverprocessen startas om. Själva kontona och historiken sparas lokalt och finns kvar.
- Kalkylatorn visar endast en förenklad annuitetsmodell, inte en officiell CSN-plan.
- Inspiration från bankers upplägg: tydlig huvudnavigering, ett framträdande erbjudande och läsbara formulär; design och text är Sparkompassens egna.

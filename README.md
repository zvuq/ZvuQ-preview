# ZvuQ-preview

Společný testovací náhled: https://zvuq.github.io/ZvuQ-preview/game/

Vzhled DJ a DJANE se ukládá odděleně v prohlížeči. Identita postavy používá přímo `dj` / `djane`; editor, karty, hra a skóre vycházejí ze stejné definice. Výběr a oba vzhledy se ukládají společně, starší nastavení se převezme bez mazání úprav. Při startu hry vznikne samostatný snímek postavy pro daný běh. Náhled používá neomezené životy a místní žebříček; není napojený na skóre zvuq.cz. Produkční balíček se aktualizuje pouze na vyžádání.

## Kontrola postav a menu

Testy procházejí nezávislé úpravy postav, přepínání karet i editoru, načtení starého nastavení, reset, náhodný vzhled, předání vzhledu do hry a místního skóre, odstupy obrázků a chování menu při pauze. Kontrolují desktop, mobil a malé obrazovky.

Vyžadují Node.js a Playwright s Chromium. Spusťte místní server nad tímto repozitářem:

```sh
python3 -m http.server 8090
```

V jiném terminálu:

```sh
npm install --no-save --package-lock=false playwright
npx playwright install chromium
node tests/avatar-identity.cjs
node tests/avatar-profiles.cjs
node tests/game-menu.cjs
node tests/run-appearance.cjs
```

Pro systémový Chromium nastavte `CHROMIUM_PATH=/usr/bin/chromium`. Testy standardně používají `http://127.0.0.1:8090/game/`; adresu testovacího náhledu lze změnit proměnnou `ZVUQ_TEST_URL`. Snímky ukládají do `/tmp`.

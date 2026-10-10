# ZvuQ-preview

Společný testovací náhled: https://zvuq.github.io/ZvuQ-preview/game/

Vzhled DJ a DJANE se ukládá odděleně v prohlížeči. Náhled používá neomezené životy a místní žebříček; není napojený na skóre zvuq.cz. Produkční balíček se aktualizuje pouze na vyžádání.

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
node tests/avatar-profiles.cjs
node tests/game-menu.cjs
```

Pro systémový Chromium nastavte `CHROMIUM_PATH=/usr/bin/chromium`. Testy standardně používají `http://127.0.0.1:8090/game/`; adresu testovacího náhledu lze změnit proměnnou `ZVUQ_TEST_URL`. Snímky ukládají do `/tmp`.

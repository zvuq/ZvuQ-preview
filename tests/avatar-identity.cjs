const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = process.env.ZVUQ_TEST_URL || 'http://127.0.0.1:8090/game/';
const stateKey = 'zvuq-test-v1-zvuq-character-state-v3';
const legacySelection = 'zvuq-test-v1-zvuq-phase-rider-character';
const v2Key = 'zvuq-test-v1-zvuq-character-avatars-v2';

// Checked against the actual DJ and DJANE drawings, rather than saved form values.
const identities = {
  dj: { label: 'DJ', headset: [242, 47, 58], chest: [244, 59, 70], eye: [232, 183, 167], mouth: [229, 173, 155] },
  djane: { label: 'DJANE', headset: [180, 255, 227], chest: [239, 94, 174], eye: [52, 33, 43], mouth: [171, 62, 107] }
};

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] });
  for (const storage of ['empty', 'v2', 'v3']) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(({ storage, stateKey, legacySelection, v2Key }) => {
      if (localStorage.getItem('identitySeed')) return;
      const profiles = {
        dj: { character: 'djane', hair: 7, color: 3 },
        djane: { character: 'dj', hair: 1, color: 2 }
      };
      if (storage === 'v2') {
        localStorage.setItem(legacySelection, 'djane');
        localStorage.setItem(v2Key, JSON.stringify(profiles));
      }
      if (storage === 'v3') {
        // Conflicting historical selection and profile metadata must not override the current identity.
        localStorage.setItem(legacySelection, 'djane');
        localStorage.setItem(stateKey, JSON.stringify({ version: 3, selected: 'dj', profiles }));
      }
      localStorage.setItem('identitySeed', '1');
    }, { storage, stateKey, legacySelection, v2Key });
    await page.goto(base);
    if (storage === 'v2') assert.equal(await page.locator('[aria-pressed="true"][data-character]').getAttribute('data-character'), 'djane');
    if (storage === 'v3') assert.equal(await page.locator('[aria-pressed="true"][data-character]').getAttribute('data-character'), 'dj');
    for (const [choice, identity] of Object.entries(identities)) {
      const card = page.locator(`[data-character="${choice}"]`);
      assert.equal(await card.locator('strong').textContent(), identity.label);
      await card.click();
      await page.locator('#customizeAvatar').click();
      assert.equal(await page.locator('#avatar-base').inputValue(), choice);
      assert.equal(await page.locator('#avatar-base option:checked').textContent(), identity.label);
      assert.equal(await page.locator('#avatarTitle').textContent(), `ÚPRAVA POSTAVY / ${identity.label}`);
      assert.equal(await page.locator('#avatarCanvas').getAttribute('aria-label'), `Náhled postavy ${identity.label}`);
      await page.locator('#resetAvatar').click();
      await page.waitForFunction(({ headset }) => {
        const rgb = document.getElementById('avatarCanvas').getContext('2d').getImageData(183, 188, 1, 1).data;
        return headset.every((channel, i) => rgb[i] === channel);
      }, identity);
      const pixels = await page.locator('#avatarCanvas').evaluate(canvas => {
        const c = canvas.getContext('2d');
        return [[183, 188], [230, 265], [222, 202], [240, 225]].map(([x, y]) => [...c.getImageData(x, y, 1, 1).data].slice(0, 3));
      });
      assert.deepEqual(pixels, [identity.headset, identity.chest, identity.eye, identity.mouth], `${choice} actual drawing is mismatched`);
      await page.keyboard.press('KeyP');
      assert.equal(await page.evaluate(() => window.__zvuqGame.getState().mode), 'menu');
      await page.locator('#avatar-base').selectOption(choice === 'dj' ? 'djane' : 'dj');
      await page.locator('#avatar-base').selectOption(choice);
      assert.equal(await page.locator('#avatarTitle').textContent(), `ÚPRAVA POSTAVY / ${identity.label}`);
      await page.locator('#closeAvatar').click();
      const before = await page.locator('.character-portrait').evaluateAll(cs => cs.map(c => c.toDataURL()));
      await page.reload();
      assert.deepEqual(await page.locator('.character-portrait').evaluateAll(cs => cs.map(c => c.toDataURL())), before);
      assert.equal(await page.locator('[aria-pressed="true"][data-character]').getAttribute('data-character'), choice);
    }
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`${storage} PASS: semantic names, card selection, editor labels, actual male/female drawings and persisted identity`);
  }
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });

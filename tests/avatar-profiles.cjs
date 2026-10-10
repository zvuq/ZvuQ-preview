const {chromium,devices}=require('playwright');
const assert=require('node:assert/strict');
const profilesKey='zvuq-test-v1-zvuq-character-state-v3';
const choiceKey='zvuq-test-v1-zvuq-phase-rider-character';
const legacyKey='zvuq-test-v1-zvuq-avatar';
const base=(process.env.ZVUQ_TEST_URL||'http://127.0.0.1:8090/game/');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
 for(const mobile of [false,true]){
  const page=await browser.newPage(mobile?devices['Pixel 7']:{viewport:{width:1440,height:1000}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);
  const cards=()=>page.locator('.character-portrait').evaluateAll(cs=>cs.map(c=>c.toDataURL()));
  const controls=()=>page.locator('#avatarControls select').evaluateAll(ss=>Object.fromEntries(ss.map(s=>[s.id.replace('avatar-',''),s.id==='avatar-base'?s.value:+s.value])));
  const select=async key=>page.locator('[data-character="'+key+'"]').click();
  const open=()=>page.locator('#customizeAvatar').click();
  const close=()=>page.locator('#closeAvatar').click();
  const defaults=await cards();assert.notEqual(defaults[0],defaults[1]);
  for(let i=0;i<6;i++){await select(i%2?'dj':'djane');assert.deepEqual(await cards(),defaults,'Selecting changed card appearances');}
  await select('dj');await open();
  for(const [key,value] of Object.entries({hair:2,hairColor:2,top:2,color:3,head:1,accessory:5,ride:2,earrings:1}))await page.locator('#avatar-'+key).selectOption(String(value));
  const dj=await controls();await close();const djCustom=await cards();assert.equal(djCustom[1],defaults[1]);assert.notEqual(djCustom[0],defaults[0]);
  await select('djane');assert.deepEqual(await cards(),djCustom);await open();const djaneDefault=await controls();assert.equal(djaneDefault.hair,5);assert.equal(djaneDefault.color,0);
  for(const [key,value] of Object.entries({hair:7,hairColor:1,top:1,color:2,head:3,accessory:1,ride:0,earrings:0}))await page.locator('#avatar-'+key).selectOption(String(value));
  const djane=await controls();await close();const bothCustom=await cards();assert.equal(bothCustom[0],djCustom[0]);assert.notEqual(bothCustom[1],djCustom[1]);
  for(let i=0;i<4;i++){await select(i%2?'djane':'dj');await open();assert.deepEqual(await controls(),i%2?djane:dj);await close();assert.deepEqual(await cards(),bothCustom);}
  await page.reload();assert.deepEqual(await cards(),bothCustom);await open();assert.deepEqual(await controls(),djane);
  await page.locator('#avatar-base').selectOption('dj');assert.deepEqual(await controls(),dj);assert.deepEqual(await cards(),bothCustom);
  await page.locator('#avatar-base').selectOption('djane');assert.deepEqual(await controls(),djane);
  await page.locator('#randomAvatar').click();assert.equal((await controls()).base,'djane');assert.equal((await cards())[0],bothCustom[0]);
  await page.locator('#resetAvatar').click();assert.deepEqual(await controls(),djaneDefault);assert.equal((await cards())[0],bothCustom[0]);await close();
  await select('dj');await open();assert.deepEqual(await controls(),dj);await close();await page.reload();assert.equal((await cards())[0],bothCustom[0]);
  // Every selectable value changes only its owner. Extreme combined head/hair/accessory values keep edge clearance.
  await open();
  await page.evaluate(()=>{
   const select=(key,value)=>{const el=document.getElementById('avatar-'+key);el.value=String(value);el.dispatchEvent(new Event('change',{bubbles:true}));};
   for(const s of document.querySelectorAll('#avatarControls select'))if(s.id!=='avatar-base')for(const o of s.options)select(s.id.replace('avatar-',''),o.value);
   for(const choice of [0,1]){select('base',choice?'djane':'dj');for(let head=0;head<4;head++)for(let hair=0;hair<8;hair++)for(let accessory=0;accessory<6;accessory++){
    select('head',head);select('hair',hair);select('accessory',accessory);
    const canvas=document.querySelectorAll('.character-portrait')[choice];const {data,width,height}=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]&&(x<24||x>=width-24||y<24||y>=height-24))throw Error(`Card edge: ${choice}/${head}/${hair}/${accessory}`);
   }}
  });
  await close();
  // Save an identifiable profile, start game, and verify score stores exactly that profile.
  await select('djane');await open();await page.locator('#resetAvatar').click();await page.locator('#avatar-hair').selectOption('6');await page.locator('#avatar-color').selectOption('1');await close();
  const expected=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).profiles.djane,profilesKey);
  await page.evaluate(()=>{const begin=window.phaseLeaderboard.begin;window.phaseLeaderboard.begin=value=>{window.testRunAvatar=structuredClone(value);return begin(value)};document.getElementById('playSilentBtn').click();});
  await page.waitForFunction(()=>window.__zvuqGame.getState().mode==='running');
  assert.deepEqual(await page.evaluate(()=>window.testRunAvatar),{character:'djane',...expected});
  assert.equal(await page.evaluate(()=>window.__zvuqGame.getState().character),'djane');
  await page.locator('#endTestBtn').click();await page.locator('#openLeaderboard').click();await page.locator('#nickname').fill('Avatar check');await page.locator('#submitScore').click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('zvuq-test-v1-phase-local-scores')||'[]').length>0);
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('zvuq-test-v1-phase-local-scores'))[0].avatar),{character:'djane',...expected});
  await page.reload();await page.locator('.character-select').screenshot({path:'/tmp/zvuq-profiles-'+(mobile?'mobile':'desktop')+'.png'});assert.deepEqual(errors,[]);
  console.log((mobile?'Mobile':'Desktop')+' PASS: stable cards, independent edits, reload, editor switching, random/reset, every option, 384 combined edge checks, game and score appearance');await page.close();
 }
 // Legacy appearance is retained only on its selected character. Invalid stored indices are ignored.
 for(const choice of ['dj','djane']){
  const page=await browser.newPage();await page.addInitScript(({choice,choiceKey,legacyKey})=>{if(!localStorage.getItem('testSeeded')){localStorage.setItem(choiceKey,choice);localStorage.setItem(legacyKey,JSON.stringify({hair:7,color:3,ride:2,earrings:0,skin:99}));localStorage.setItem('testSeeded','1');}},{choice,choiceKey,legacyKey});await page.goto(base);await page.locator('#customizeAvatar').click();assert.equal(await page.locator('#avatar-hair').inputValue(),'7');assert.equal(await page.locator('#avatar-color').inputValue(),'3');assert.equal(await page.locator('#avatar-skin').inputValue(),'0');await page.locator('#avatar-base').selectOption(choice==='dj'?'djane':'dj');assert.equal(await page.locator('#avatar-color').inputValue(),'0');assert.equal(await page.locator('#avatar-hair').inputValue(),choice==='dj'?'5':'0');await page.locator('#avatar-base').selectOption(choice);assert.equal(await page.locator('#avatar-hair').inputValue(),'7');await page.reload();await page.locator('#customizeAvatar').click();assert.equal(await page.locator('#avatar-hair').inputValue(),'7');await page.close();console.log('Legacy migration '+choice+' PASS');
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});

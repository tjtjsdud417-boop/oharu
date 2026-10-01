(function (root) {
  'use strict';
  const KEYS = ['bg','card','text','muted','accent','soft','line','danger','dangerSoft'];
  const MAP = {bg:'--bg',card:'--card',text:'--text',muted:'--text-sub',accent:'--blue',soft:'--blue-soft',line:'--line',danger:'--danger',dangerSoft:'--danger-soft'};
  // Keep ThemeV1's nine fields for existing saved/imported files. Only foreground
  // and button colors vary; surfaces and decorative separators retain the brand.
  const SURFACES={bg:'#F2F4F6',card:'#FFFFFF',soft:'#E8F3FF',line:'#F2F4F6',dangerSoft:'#FEECEE'};
  const COLORS=['text','muted','accent','danger'];
  const PAIRS=[['text','bg'],['text','card'],['muted','bg'],['muted','card'],['accent','bg'],['accent','card'],['accent','soft'],['danger','card'],['danger','dangerSoft']];
  const palettes = [
    ['default','오하루 기본','#F2F4F6','#FFFFFF','#191F28','#526070','#205FC1','#E8F3FF'],
    ['forest','숲의 아침','#E9F0E8','#F9FCF7','#203B2C','#4D6556','#286440','#DCECDD'],
    ['rose','로즈 가든','#F7E9ED','#FFF9FB','#492A36','#775461','#994460','#F5DFE7'],
    ['ocean','푸른 바다','#E5F0F5','#F8FCFF','#173C50','#496573','#126782','#D5EDF5'],
    ['lavender','라벤더 오후','#EEEAF8','#FCFAFF','#352B51','#675A7D','#6943A3','#E9DFF8'],
    ['sand','모래와 햇살','#F4EDDD','#FFFCF5','#463923','#6E6049','#826018','#EFE3C7'],
    ['mint','민트 한 잔','#E4F3EE','#F8FFFC','#1E443A','#4A6A61','#176C57','#D1EDE2'],
    ['peach','복숭아빛','#FAEDE4','#FFFAF6','#513528','#7D5945','#A04B24','#F6E0D0'],
    ['slate','차분한 잉크','#E8ECF0','#F9FBFD','#253342','#546373','#405D7B','#DFE7EF'],
    ['lemon','레몬 정원','#F3F3DF','#FFFFF7','#3C4224','#626749','#626B1E','#E9EBCB']
  ];
  // New illustrated themes are deferred until the owner approves representative designs.
  const SCENES=['none'],PATTERNS=['none'];
  const EN_NAMES=['Oharu default','Forest morning','Rose garden','Blue ocean','Lavender afternoon','Sand and sunlight','A cup of mint','Peach','Quiet ink','Lemon garden'];
  const themes = palettes.map(([id,name,bg,card,text,muted,accent,soft],i) => ({id,name,enName:EN_NAMES[i],version:1,tokens:{bg,card,text,muted,accent,soft,line:bg,danger:'#AF2434',dangerSoft:'#FEECEE',...SURFACES}}));
  const DEFAULT={version:1,name:'오하루 기본',tokens:{bg:'#F2F4F6',card:'#FFFFFF',text:'#191F28',muted:'#526070',accent:'#205FC1',soft:'#E8F3FF',line:'#F2F4F6',danger:'#AF2434',dangerSoft:'#FEECEE'}};
  function validateVisual(v) {
    if(!v || typeof v!=='object' || Array.isArray(v) || Object.keys(v).sort().join(',')!=='motion,pattern,pet,scene') throw Error('장식은 scene, pattern, pet, motion만 사용할 수 있어요.');
    if(!SCENES.includes(v.scene) || !PATTERNS.includes(v.pattern) || v.pet!=='none' || v.motion!=='off') throw Error('승인된 장식만 사용할 수 있어요. 새 일러스트와 펫은 아직 준비 중이에요.');
    return {scene:v.scene,pattern:v.pattern,pet:v.pet,motion:v.motion};
  }
  function luminance(hex) { const a=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4)); return .2126*a[0]+.7152*a[1]+.0722*a[2]; }
  function contrast(a,b) { const x=luminance(a),y=luminance(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }
  function checkContrast(t) {
    for(const [a,b] of PAIRS) if(contrast(t[a],t[b])<4.5) throw Error(a+' / '+b+' 글자 대비가 낮아요. 4.5:1 이상으로 조정해 주세요.');
    if(contrast(t.accent,'#FFFFFF')<4.5) throw Error('버튼의 흰색 글자가 읽히도록 강조색을 어둡게 해 주세요.');
  }
  function validate(input) {
    if (typeof input==='string') { if(input.length>8192) throw Error('테마 파일은 8KB 이하여야 해요.'); input=JSON.parse(input); }
    if(!input || typeof input!=='object' || Array.isArray(input) || !['name,tokens,version','name,tokens,version,visual'].includes(Object.keys(input).sort().join(','))) throw Error('version, name, tokens와 선택적인 visual만 사용할 수 있어요.');
    if(input.version!==1 || typeof input.name!=='string' || input.name.length<1 || input.name.length>40 || /[\u0000-\u001f<>]/.test(input.name)) throw Error('테마 이름 또는 버전을 확인해 주세요.');
    const t=input.tokens;
    if(!t || typeof t!=='object' || Array.isArray(t) || Object.keys(t).sort().join(',')!==KEYS.slice().sort().join(',')) throw Error('색상 토큰 9개를 정확히 입력해 주세요.');
    for(const k of KEYS) if(typeof t[k]!=='string' || !/^#[0-9a-f]{6}$/i.test(t[k])) throw Error('색상은 #RRGGBB 형식만 사용할 수 있어요.');
    const tokens={...Object.fromEntries(KEYS.map(k=>[k,t[k].toUpperCase()])),...SURFACES};
    if(Object.entries(SURFACES).some(([k,v])=>t[k].toUpperCase()!==v)){
      // A previously valid dark/colored ThemeV1 file keeps its identity. Replace
      // only foregrounds that cannot be read on the now-fixed surfaces. Never
      // rescue malformed or previously illegible data, or mutate the input object.
      checkContrast(t);
      for(const k of COLORS)if(PAIRS.some(([a,b])=>a===k&&contrast(tokens[a],tokens[b])<4.5)||(k==='accent'&&contrast(tokens.accent,'#FFFFFF')<4.5))tokens[k]=DEFAULT.tokens[k];
    }
    checkContrast(tokens);
    return {version:1,name:input.name,tokens,...(input.visual?{visual:validateVisual(input.visual)}:{})};
  }
  function portable(t) { return {version:1,name:t.name,tokens:{...t.tokens},...(t.visual?{visual:validateVisual(t.visual)}:{})}; }
  themes.forEach(t=>validate(portable(t)));
  let current={id:'default'}, account='guest', client=null, statusEl=null, selectEl=null, pending=false, generation=0;
  let ownership=0, resetDraft=()=>{}, refreshUI=()=>{};
  const english=()=>root.document?.documentElement.lang!=='ko' && !!root.document?.documentElement.lang;
  const text=(ko,en)=>english()?en:ko;
  const storageKey=()=> 'oharu.theme.v1.'+account;
  function switchAccount(next) {
    if(next===account) return;
    account=next; ownership++; generation++; pending=false; resetDraft(); message(''); restore();
  }
  function message(value) { const translated={'현재 화면에 적용했어요. 저장 공간을 사용할 수 없어 다시 열면 복원되지 않아요.':'Applied to this screen. Storage is unavailable, so it will not restore after reopening.','이 기기에 저장했어요. 로그인하면 계정 테마를 사용할 수 있어요.':'Saved on this device. Sign in to use account themes.','계정에 저장했어요. 다른 기기는 다시 열면 같은 테마를 적용해요.':'Saved to your account. Reopen Oharu on other devices to load this theme.','이 기기에는 적용했어요. 계정 동기화에 실패했어요. 온라인에서 테마를 다시 선택해 주세요.':'Applied on this device. Account sync failed. Select the theme again when online.','계정 테마를 불러오지 못했어요. 이 기기의 테마를 유지해요.':'Could not load account themes. Keeping this device’s theme.'};if(statusEl)statusEl.textContent=english()?(translated[value]||value):value; }
  function normalize(value) {
    if(!value || typeof value!=='object') throw Error('잘못된 테마 설정이에요.');
    if(value.id==='custom') return {id:'custom',theme:validate(value.theme)};
    if(value.id==='default') return {id:'default'};
    if(themes.some(t=>t.id===value.id)) { validate(portable(themes.find(t=>t.id===value.id))); return {id:value.id}; }
    throw Error('지원하지 않는 테마예요.');
  }
  function apply(value) {
    current=normalize(value);
    if(!root.document) return;
    const el=root.document.documentElement;
    for(const v of Object.values(MAP).concat('--text-faint','--theme-bg-rgb')) el.style.removeProperty(v);
    delete el.dataset.oharuTheme;
    if(current.id!=='default') {
      const theme=current.id==='custom'?current.theme:themes.find(t=>t.id===current.id);
      for(const k of COLORS) el.style.setProperty(MAP[k],theme.tokens[k]);
      el.style.setProperty('--text-faint',theme.tokens.muted);
      el.dataset.oharuTheme=current.id;
    }
    if(selectEl) { let custom=selectEl.querySelector('[value="custom"]'); if(current.id==='custom' && !custom) { custom=root.document.createElement('option'); custom.value='custom'; selectEl.append(custom); } if(custom) { if(current.id==='custom') custom.textContent=current.theme.name; else custom.remove(); } selectEl.value=current.id; }
    const theme=current.id==='default'?DEFAULT:current.id==='custom'?current.theme:themes.find(t=>t.id===current.id);
    const visual=theme.visual || {scene:'none',pattern:'none',pet:'none',motion:'off'};
    el.dataset.themeScene=visual.scene;el.dataset.themePattern=visual.pattern;el.dataset.themePet=visual.pet;el.dataset.themeMotion=visual.motion;
    const asset=root.OharuThemeAssets?.scenes?.[visual.scene];
    if(asset) el.style.setProperty('--theme-scene', 'url("'+asset+'")');else el.style.removeProperty('--theme-scene');
    refreshUI();
  }
  function restore() { try { apply(JSON.parse(root.localStorage.getItem(storageKey())) || {id:'default'}); } catch(_) { apply({id:'default'}); } }
  function cache() { try { root.localStorage.setItem(storageKey(),JSON.stringify(current)); return true; } catch(_) { message('현재 화면에 적용했어요. 저장 공간을 사용할 수 없어 다시 열면 복원되지 않아요.'); return false; } }
  let writeQueue=Promise.resolve();
  function save(value) {
    apply(value); const cached=cache(); pending=true;
    if(!client || account==='guest') { if(cached) message('이 기기에 저장했어요. 로그인하면 계정 테마를 사용할 수 있어요.'); return Promise.resolve(); }
    const owner=account, epoch=ownership, snapshot=JSON.parse(JSON.stringify(current));
    writeQueue=writeQueue.catch(()=>{}).then(async()=>{
      if(account!==owner || epoch!==ownership) return;
      try { const {error}=await client.auth.updateUser({data:{oharu_theme_v1:snapshot}}); if(error) throw error; if(account===owner && epoch===ownership) { pending=false; message('계정에 저장했어요. 다른 기기는 다시 열면 같은 테마를 적용해요.'); } }
      catch(_) { if(account===owner && epoch===ownership) message('이 기기에는 적용했어요. 계정 동기화에 실패했어요. 온라인에서 테마를 다시 선택해 주세요.'); }
    });
    return writeQueue;
  }
  async function refresh() {
    if(!client) return;
    const turn=++generation;
    try {
      const {data,error}=await client.auth.getUser(); if(error || turn!==generation) return;
      const user=data.user, next=user?user.id:'guest';
      switchAccount(next);
      if(user && !pending && user.user_metadata && user.user_metadata.oharu_theme_v1) { apply(user.user_metadata.oharu_theme_v1); cache(); }
    } catch(_) { message('계정 테마를 불러오지 못했어요. 이 기기의 테마를 유지해요.'); }
  }
  function connect(supabase) {
    if(client===supabase) return; client=supabase;
    client.auth.onAuthStateChange((event,session)=>{
      // Never await Supabase methods inside its auth callback.
      if(event==='SIGNED_OUT') { generation++; switchAccount('guest'); }
      else if(session && (event==='SIGNED_IN' || event==='INITIAL_SESSION')) { switchAccount(session.user.id); root.setTimeout(refresh,0); }
    });
    refresh();
  }
  const prompt='오하루 테마 JSON을 만들어 주세요. 할 일, 계정 정보, API 키는 필요하지 않습니다. 코드 블록 없이 JSON만 출력하세요. 구조는 '+JSON.stringify(portable(themes[1]))+'. version=1, name은 1~40자, tokens의 9개 키 값은 #RRGGBB만 가능합니다. 버튼·글자색(text, muted, accent, danger)만 변경합니다. bg=#F2F4F6, card=#FFFFFF, soft=#E8F3FF, line=#F2F4F6, dangerSoft=#FEECEE는 고정입니다. 카드 배경·형태·폰트·레이아웃은 유지합니다. 선택적인 visual은 scene=none, pattern=none, pet=none, motion=off만 허용합니다. text와 muted는 bg/card에, accent는 bg/card/soft에, danger는 card/dangerSoft에 WCAG 대비 4.5:1 이상이어야 합니다. accent 위 흰색 버튼 글자도 4.5:1 이상이어야 합니다. URL, CSS, JavaScript, 사용자 자산, 추가 속성은 금지합니다. 원하는 분위기: ';
  function previewImage(theme) {
    const t=validate(portable(theme)).tokens;
    const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 180"><rect width="280" height="180" fill="'+t.bg+'"/><rect x="20" y="19" width="50" height="6" rx="3" fill="'+t.muted+'"/><rect x="20" y="36" width="143" height="12" rx="5" fill="'+t.text+'"/><rect x="215" y="20" width="42" height="25" rx="8" fill="'+t.accent+'"/><rect x="20" y="65" width="240" height="92" rx="14" fill="'+t.card+'"/><circle cx="40" cy="88" r="6" stroke="'+t.muted+'" fill="none"/><rect x="58" y="84" width="144" height="7" rx="3" fill="'+t.text+'"/><rect x="58" y="97" width="48" height="4" rx="2" fill="'+t.muted+'"/><circle cx="40" cy="127" r="6" fill="'+t.accent+'"/><rect x="58" y="123" width="112" height="7" rx="3" fill="'+t.muted+'"/></svg>';
    return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  }
  function mount() {
    const host=root.document.getElementById('setThemes') || root.document.getElementById('setDesign');
    if(!host || root.document.getElementById('oharu-theme-settings')) return;
    const section=root.document.createElement('section');section.id='oharu-theme-settings';section.className='oharu-theme-settings';
    section.innerHTML=`<details id="oharu-theme-panel"><summary class="theme-entry"><span class="theme-entry-art" aria-hidden="true"></span><span><strong data-theme-ko="나만의 스타일로 꾸며보세요!" data-theme-en="Make Oharu your own"></strong><span data-theme-ko="테마 설정" data-theme-en="Theme settings"></span></span><span class="theme-entry-arrow" aria-hidden="true">›</span></summary>
      <div class="theme-panel-content"><p class="settings-note" data-theme-ko="버튼·글자색을 미리 확인해 보세요. 화면과 카드 배경은 유지해요." data-theme-en="Preview button and text colors. Page and card backgrounds stay the same."></p><div class="theme-grid" aria-label="Themes"></div>
      <label for="oharu-theme-select" data-theme-ko="빠르게 고르기" data-theme-en="Choose a theme"></label><select id="oharu-theme-select"></select>
      <div class="oharu-theme-actions"><button type="button" data-action="reset" data-theme-ko="오하루 기본으로" data-theme-en="Restore Oharu default"></button></div>
      </div></details>
      <details id="oharu-theme-ai"><summary class="theme-ai-entry"><span aria-hidden="true">✦</span><span><strong data-theme-ko="AI로 나만의 테마 만들기" data-theme-en="Create your own theme with AI"></strong><small data-theme-ko="원하는 분위기를 말해 주세요" data-theme-en="Describe the mood you want"></small></span><span aria-hidden="true">›</span></summary>
      <div class="theme-panel-content"><p class="settings-note" data-theme-ko="요청문을 AI에게 보내고, 받은 JSON을 붙여넣으면 미리 볼 수 있어요." data-theme-en="Send the prompt to your AI, then paste its JSON to preview your theme."></p>
      <label for="oharu-theme-mood" data-theme-ko="어떤 분위기가 좋으세요?" data-theme-en="What mood would you like?"></label><input id="oharu-theme-mood" maxlength="160" placeholder="예: 햇살이 드는 조용한 서점">
      <div class="oharu-theme-actions"><button type="button" data-action="copy" class="theme-primary" data-theme-ko="1. 요청문 복사" data-theme-en="1. Copy prompt"></button><a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">ChatGPT <span data-theme-ko="열기" data-theme-en="open"></span></a><a href="https://claude.ai/" target="_blank" rel="noopener noreferrer">Claude <span data-theme-ko="열기" data-theme-en="open"></span></a></div>
      <p class="settings-note" data-theme-ko="AI 사이트를 여는 기능이에요. 오하루 계정이나 할 일은 연결하지 않아요." data-theme-en="These links open AI websites. They do not connect your Oharu account or tasks."></p>
      <label for="oharu-theme-json" data-theme-ko="AI에게 전달받은 JSON 붙여넣기" data-theme-en="Paste the JSON you received from AI"></label><textarea id="oharu-theme-json" maxlength="8192" rows="5" spellcheck="false"></textarea>
      <button type="button" data-action="import" class="theme-primary" data-theme-ko="2. 검사하고 미리 보기" data-theme-en="2. Validate and preview"></button>
      <details class="theme-file-details"><summary data-theme-ko="JSON 파일 가져오기 · 내보내기" data-theme-en="Import or export a JSON file"></summary><button type="button" data-action="file" data-theme-ko="JSON 파일 선택 (8KB 이하)" data-theme-en="Choose a JSON file (up to 8KB)"></button><input id="oharu-theme-file" type="file" accept=".json,application/json" hidden><p id="theme-file-name" class="settings-note"></p><button type="button" data-action="export" data-theme-ko="현재 테마 JSON 내보내기" data-theme-en="Export current theme JSON"></button></details></div></details>
      <div class="oharu-theme-preview" hidden><img class="theme-preview-art" alt=""><div class="oharu-theme-sample"><strong class="theme-preview-name"></strong><span data-theme-ko="오늘의 할 일" data-theme-en="Today's tasks"></span><span class="theme-preview-task" data-theme-ko="산책 20분 · 오후 3:00" data-theme-en="A 20 minute walk · 3:00 pm"></span></div><p class="theme-preview-result settings-note"></p><button type="button" data-action="confirm" class="theme-primary" data-theme-ko="미리 본 테마 적용" data-theme-en="Apply previewed theme"></button></div>
      <div class="theme-motion-row" hidden><label for="oharu-theme-motion" data-theme-ko="펫의 잔잔한 움직임" data-theme-en="Gentle pet motion"></label><input type="checkbox" id="oharu-theme-motion"><p class="settings-note" data-theme-ko="선택한 경우에만 움직여요. 기기의 동작 줄이기 설정을 따릅니다." data-theme-en="Motion is optional and follows your device's reduced motion setting."></p></div>
      <p class="oharu-theme-status settings-note" role="status" aria-live="polite"></p><button type="button" data-action="undo" hidden data-theme-ko="이전 테마로 되돌리기" data-theme-en="Undo theme change"></button>`;
    host.append(section);selectEl=section.querySelector('#oharu-theme-select');statusEl=section.querySelector('[role="status"]');
    const option=root.document.createElement('option');option.value='default';selectEl.append(option);
    const grid=section.querySelector('.theme-grid');
    for(const theme of themes) {
      const option=root.document.createElement('option');option.value=theme.id;selectEl.append(option);
      const card=root.document.createElement('button');card.type='button';card.className='theme-card';card.dataset.themeId=theme.id;card.setAttribute('aria-pressed','false');
      const image=root.document.createElement('img');image.alt='';image.loading='lazy';image.decoding='async';image.src=previewImage(theme);
      const name=root.document.createElement('strong');name.className='theme-card-name';const state=root.document.createElement('span');state.className='theme-card-state';
      card.append(image,name,state);card.onclick=()=>stage({...portable(theme),name:english()?theme.enName:theme.name},{id:theme.id});grid.append(card);
    }
    const entryArt=section.querySelector('.theme-entry-art');
    for(const theme of [themes[6],themes[0]]) {const img=root.document.createElement('img');img.alt='';img.src=previewImage(theme);entryArt.append(img);}
    const area=section.querySelector('textarea'),preview=section.querySelector('.oharu-theme-preview'),sample=section.querySelector('.oharu-theme-sample'),result=section.querySelector('.theme-preview-result'),undo=section.querySelector('[data-action="undo"]'),motion=section.querySelector('#oharu-theme-motion');
    let previewTheme=null,previewValue=null,previous=null,previewOwner=-1,previousOwner=-1;
    function localize() {
      section.querySelectorAll('[data-theme-ko]').forEach(node=>node.textContent=english()?node.dataset.themeEn:node.dataset.themeKo);
      selectEl.options[0].textContent=text('오하루 기본','Oharu default');selectEl.setAttribute('aria-label',text('테마 선택','Choose a theme'));
      section.querySelector('#oharu-theme-mood').placeholder=text('예: 햇살이 드는 조용한 서점','e.g. a quiet bookshop in warm sunlight');
      for(const theme of themes){selectEl.querySelector('[value="'+theme.id+'"]').textContent=english()?theme.enName:theme.name;const card=grid.querySelector('[data-theme-id="'+theme.id+'"]');card.querySelector('.theme-card-name').textContent=english()?theme.enName:theme.name;card.querySelector('.theme-card-state').textContent=current.id===theme.id?text('사용 중','Current'):text('미리 보기','Preview');card.setAttribute('aria-pressed',String(current.id===theme.id));}
    }
    refreshUI=()=>{localize();const theme=current.id==='default'?DEFAULT:current.id==='custom'?current.theme:themes.find(t=>t.id===current.id);section.querySelector('.theme-motion-row').hidden=theme.visual?.pet!=='cat';motion.checked=theme.visual?.motion==='gentle';};
    function stage(theme,value) {
      previewTheme=validate(theme);previewValue=value;previewOwner=ownership;const t=previewTheme.tokens;
      sample.style.backgroundColor=t.card;sample.style.color=t.text;preview.style.backgroundColor=t.bg;preview.style.color=t.text;
      section.querySelector('.theme-preview-name').textContent=previewTheme.name;
      const art=section.querySelector('.theme-preview-art');art.hidden=false;art.src=previewImage(previewTheme);
      result.textContent=text('읽기 쉬운 대비 검사를 통과했어요. 적용하기 전 미리 확인해 주세요.','Readability checks passed. Review your theme before applying.');preview.hidden=false;
      message(text('미리보기 중이에요. 적용을 누르면 저장해요.','Preview only. Apply to save your theme.'));
      preview.scrollIntoView({block:'nearest',behavior:'auto'});section.querySelector('[data-action="confirm"]').focus({preventScroll:true});
    }
    apply(current);selectEl.addEventListener('change',()=>{if(selectEl.value!=='custom'){const theme=selectEl.value==='default'?DEFAULT:themes.find(t=>t.id===selectEl.value);stage(portable(theme),{id:selectEl.value});selectEl.value=current.id;}});
    resetDraft=()=>{previewTheme=null;previewValue=null;previous=null;previewOwner=-1;previousOwner=-1;preview.hidden=true;undo.hidden=true;area.value='';section.querySelector('input[type="file"]').value='';section.querySelector('#theme-file-name').textContent='';};
    area.addEventListener('input',()=>{previewTheme=null;previewValue=null;preview.hidden=true;});
    section.querySelector('input[type="file"]').addEventListener('change',async event=>{previewTheme=null;previewValue=null;preview.hidden=true;const epoch=ownership,file=event.target.files[0];if(!file)return;section.querySelector('#theme-file-name').textContent=file.name;try{if(file.size>8192)throw Error(text('파일은 8KB 이하여야 해요.','The file must be 8KB or smaller.'));const value=await file.text();if(epoch!==ownership)return;area.value=value;message(text('파일을 읽었어요. 검사하고 미리 보기를 눌러 주세요.','File loaded. Validate and preview it.'));}catch(e){if(epoch===ownership)message(e.message);}});
    motion.addEventListener('change',()=>{const theme=portable(current.id==='custom'?current.theme:themes.find(t=>t.id===current.id)||DEFAULT);if(theme.visual?.pet!=='cat')return;theme.visual.motion=motion.checked?'gentle':'off';save({id:'custom',theme});});
    section.addEventListener('click',async event=>{const action=event.target.closest('[data-action]')?.dataset.action;if(!action)return;try{
      if(action==='reset')await save({id:'default'});
      if(action==='file')section.querySelector('input[type="file"]').click();
      if(action==='copy'){previewTheme=null;previewValue=null;preview.hidden=true;const englishPrompt='Create an Oharu color theme as JSON only, without a code fence. No tasks, account details or API keys are needed. Use this structure: '+JSON.stringify(portable(themes[1]))+'. version=1; name has 1–40 characters; exactly nine token keys, with #RRGGBB colors. Change only text, muted, accent and danger colors. Keep bg=#F2F4F6, card=#FFFFFF, soft=#E8F3FF, line=#F2F4F6 and dangerSoft=#FEECEE fixed. Preserve card backgrounds, shapes, fonts and layout. Optional visual is limited to scene=none, pattern=none, pet=none, motion=off. Contrast must be at least 4.5:1 for text and muted on bg/card, accent on bg/card/soft, danger on card/dangerSoft, and white text on accent. URLs, CSS, JavaScript, custom assets and other properties are prohibited. Desired mood: ';const value=(english()?englishPrompt:prompt)+section.querySelector('#oharu-theme-mood').value.trim();try{await root.navigator.clipboard.writeText(value);message(text('요청문을 복사했어요. AI에 붙여넣어 주세요.','Prompt copied. Paste it into your AI.'));}catch(_){area.value=value;area.focus();area.select();message(text('자동 복사가 허용되지 않았어요. 선택된 요청문을 직접 복사해 주세요.','Copy is unavailable. Copy the selected prompt manually.'));}}
      if(action==='import'){const theme=validate(area.value);stage(theme,{id:'custom',theme});}
      if(action==='confirm'&&previewTheme&&previewOwner===ownership){const epoch=ownership;previous=JSON.parse(JSON.stringify(current));previousOwner=epoch;await save(previewValue);if(epoch===ownership){undo.hidden=false;preview.hidden=true;}}
      if(action==='undo'&&previous&&previousOwner===ownership){const value=previous;previous=null;previousOwner=-1;undo.hidden=true;await save(value);}
      if(action==='export'){previewTheme=null;previewValue=null;preview.hidden=true;area.value=JSON.stringify(portable(current.id==='default'?DEFAULT:current.id==='custom'?current.theme:themes.find(t=>t.id===current.id)),null,2);if(root.OharuThemeNavigation)root.OharuThemeNavigation.selectTab('ai');else section.querySelector('#oharu-theme-ai').open=true;area.focus();area.select();message(text('현재 테마 JSON이에요. 다른 기기에서도 가져올 수 있어요.','This is your current theme JSON. You can import it on another device.'));}
    }catch(e){message(text('적용하지 않았어요: '+e.message,'Not applied. Check the JSON format, allowed fields, colors and text contrast.'));}});
    api.localize=refreshUI;
  }

  const api={themes,validate,validateVisual,contrast,connect,save,apply,normalize,prompt,exportTheme:()=>portable(current.id==='default'?DEFAULT:current.id==='custom'?current.theme:themes.find(t=>t.id===current.id))};
  if(typeof module==='object' && module.exports) module.exports=api;
  root.OharuThemes=api;
  if(root.document) { restore(); if(root.document.readyState==='loading') root.document.addEventListener('DOMContentLoaded',mount); else mount(); root.addEventListener('storage',e=>{if(e.key===storageKey()) restore();}); root.addEventListener('focus',refresh); }
})(typeof window!=='undefined'?window:globalThis);

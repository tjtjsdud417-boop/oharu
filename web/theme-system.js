(function (root) {
  'use strict';
  const KEYS = ['bg','card','text','muted','accent','soft','line','danger','dangerSoft'];
  const MAP = {bg:'--bg',card:'--card',text:'--text',muted:'--text-sub',accent:'--blue',soft:'--blue-soft',line:'--line',danger:'--danger',dangerSoft:'--danger-soft'};
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
  const themes = palettes.map(([id,name,bg,card,text,muted,accent,soft]) => ({id,name,version:1,tokens:{bg,card,text,muted,accent,soft,line:bg,danger:'#AF2434',dangerSoft:'#FEECEE'}}));
  function luminance(hex) { const a=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4)); return .2126*a[0]+.7152*a[1]+.0722*a[2]; }
  function contrast(a,b) { const x=luminance(a),y=luminance(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }
  function validate(input) {
    if (typeof input==='string') { if(input.length>8192) throw Error('테마 파일은 8KB 이하여야 해요.'); input=JSON.parse(input); }
    if(!input || typeof input!=='object' || Array.isArray(input) || Object.keys(input).sort().join(',')!=='name,tokens,version') throw Error('version, name, tokens만 사용할 수 있어요.');
    if(input.version!==1 || typeof input.name!=='string' || input.name.length<1 || input.name.length>40 || /[\u0000-\u001f<>]/.test(input.name)) throw Error('테마 이름 또는 버전을 확인해 주세요.');
    const t=input.tokens;
    if(!t || typeof t!=='object' || Array.isArray(t) || Object.keys(t).sort().join(',')!==KEYS.slice().sort().join(',')) throw Error('색상 토큰 9개를 정확히 입력해 주세요.');
    for(const k of KEYS) if(typeof t[k]!=='string' || !/^#[0-9a-f]{6}$/i.test(t[k])) throw Error('색상은 #RRGGBB 형식만 사용할 수 있어요.');
    const pairs=[['text','bg'],['text','card'],['muted','bg'],['muted','card'],['accent','bg'],['accent','card'],['accent','soft'],['danger','card'],['danger','dangerSoft']];
    for(const [a,b] of pairs) if(contrast(t[a],t[b])<4.5) throw Error(a+' / '+b+' 글자 대비가 낮아요. 4.5:1 이상으로 조정해 주세요.');
    if(contrast(t.accent,'#FFFFFF')<4.5) throw Error('버튼의 흰색 글자가 읽히도록 강조색을 어둡게 해 주세요.');
    return {version:1,name:input.name,tokens:Object.fromEntries(KEYS.map(k=>[k,t[k].toUpperCase()]))};
  }
  function portable(t) { return {version:1,name:t.name,tokens:t.tokens}; }
  themes.forEach(t=>validate(portable(t)));
  let current={id:'default'}, account='guest', client=null, statusEl=null, selectEl=null, pending=false, generation=0;
  let ownership=0, resetDraft=()=>{};
  const storageKey=()=> 'oharu.theme.v1.'+account;
  function switchAccount(next) {
    if(next===account) return;
    account=next; ownership++; generation++; pending=false; resetDraft(); message(''); restore();
  }
  function message(text) { if(statusEl) statusEl.textContent=text; }
  function normalize(value) {
    if(!value || typeof value!=='object') throw Error('잘못된 테마 설정이에요.');
    if(value.id==='custom') return {id:'custom',theme:validate(value.theme)};
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
      for(const k of KEYS) el.style.setProperty(MAP[k],theme.tokens[k]);
      el.style.setProperty('--text-faint',theme.tokens.muted);
      el.style.setProperty('--theme-bg-rgb',theme.tokens.bg.slice(1).match(/../g).map(x=>parseInt(x,16)).join(' '));
      el.dataset.oharuTheme=current.id;
    }
    if(selectEl) { let custom=selectEl.querySelector('[value="custom"]'); if(current.id==='custom' && !custom) { custom=root.document.createElement('option'); custom.value='custom'; selectEl.append(custom); } if(custom) { if(current.id==='custom') custom.textContent=current.theme.name; else custom.remove(); } selectEl.value=current.id; }
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
  const prompt='오하루 테마 JSON을 만들어 주세요. 할 일, 계정 정보, API 키는 필요하지 않습니다. 코드 블록 없이 JSON만 출력하세요. 구조는 '+JSON.stringify(portable(themes[1]))+'. version=1, name은 1~40자, tokens의 9개 키만 허용하며 값은 #RRGGBB만 가능합니다. text와 muted는 bg/card에, accent는 bg/card/soft에, danger는 card/dangerSoft에 WCAG 대비 4.5:1 이상이어야 합니다. accent 위 흰색 버튼 글자도 4.5:1 이상이어야 합니다. URL, CSS, JavaScript, 추가 속성은 금지합니다. 원하는 분위기: ';
  function mount() {
    const host=root.document.getElementById('setDesign'); if(!host || root.document.getElementById('oharu-theme-settings')) return;
    const section=root.document.createElement('section'); section.id='oharu-theme-settings'; section.className='oharu-theme-settings';
    section.innerHTML='<label for="oharu-theme-select">테마</label><select id="oharu-theme-select" aria-label="테마 선택"></select><div class="oharu-theme-actions"><button type="button" data-action="reset">기본으로 복원</button><button type="button" data-action="export">JSON 내보내기</button></div><details><summary>AI로 나만의 테마 만들기</summary><p>요청문을 복사해 ChatGPT 또는 Claude에 붙여 넣고, 받은 JSON을 아래에 넣어 주세요. 구독의 앱 연결 지원 범위는 서비스마다 달라요. 이 방법은 별도 API 키 없이 사용하며, 할 일과 계정 정보를 전달하지 않아요.</p><div class="oharu-theme-actions"><button type="button" data-action="copy">1. 요청문 복사</button><a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">ChatGPT 열기</a><a href="https://claude.ai/" target="_blank" rel="noopener noreferrer">Claude 열기</a></div><label for="oharu-theme-json">2. 테마 JSON 붙여 넣기</label><textarea id="oharu-theme-json" maxlength="8192" rows="5" spellcheck="false"></textarea><label for="oharu-theme-file">또는 JSON 파일 선택 (8KB 이하)</label><input id="oharu-theme-file" type="file" accept=".json,application/json"><button type="button" data-action="import">3. 검사하고 적용</button></details><p class="oharu-theme-status" role="status" aria-live="polite"></p>';
    host.append(section); selectEl=section.querySelector('select'); statusEl=section.querySelector('[role="status"]');
    for(const theme of themes) { const option=root.document.createElement('option'); option.value=theme.id; option.textContent=theme.name; selectEl.append(option); }
    apply(current); selectEl.addEventListener('change',()=>{ if(selectEl.value!=='custom') save({id:selectEl.value}); });
    const area=section.querySelector('textarea');
    let previewTheme=null, previous=null, previewOwner=-1, previousOwner=-1;
    const preview=root.document.createElement('div'); preview.className='oharu-theme-preview'; preview.hidden=true;
    const sample=root.document.createElement('div'); sample.className='oharu-theme-sample'; sample.textContent='오늘의 할 일 · 산책 20분 · 오후 3:00';
    const result=root.document.createElement('p');
    const confirm=root.document.createElement('button'); confirm.type='button'; confirm.textContent='미리 본 테마 적용'; confirm.dataset.action='confirm';
    preview.append(sample,result,confirm); section.querySelector('details').append(preview);
    const undo=root.document.createElement('button'); undo.type='button'; undo.textContent='이전 테마로 되돌리기'; undo.dataset.action='undo'; undo.hidden=true; section.append(undo);
    resetDraft=()=>{ previewTheme=null; previous=null; previewOwner=-1; previousOwner=-1; preview.hidden=true; undo.hidden=true; area.value=''; section.querySelector('input[type="file"]').value=''; };
    section.querySelector('[data-action="import"]').textContent='3. 검사하고 미리 보기';
    area.addEventListener('input',()=>{ previewTheme=null; preview.hidden=true; });
    section.querySelector('input[type="file"]').addEventListener('change',async event=>{ previewTheme=null; preview.hidden=true; const epoch=ownership, file=event.target.files[0]; if(!file) return; try { if(file.size>8192) throw Error('파일은 8KB 이하여야 해요.'); const text=await file.text(); if(epoch!==ownership) return; area.value=text; message('파일을 읽었어요. 검사하고 미리 보기를 눌러 주세요.'); } catch(e) { if(epoch===ownership) message(e.message); } });
    section.addEventListener('click',async event=>{
      const action=event.target.dataset.action; if(!action) return;
      try {
        if(action==='reset') await save({id:'default'});
        if(action==='copy') { try { await root.navigator.clipboard.writeText(prompt); message('요청문을 복사했어요. 원하는 분위기를 덧붙여 주세요.'); } catch(_) { area.value=prompt; area.focus(); area.select(); message('자동 복사가 허용되지 않았어요. 선택된 요청문을 직접 복사해 주세요.'); } }
        if(action==='import') {
          previewTheme=validate(area.value); previewOwner=ownership; const t=previewTheme.tokens;
          sample.style.backgroundColor=t.card; sample.style.color=t.text; preview.style.backgroundColor=t.bg; preview.style.color=t.text;
          result.textContent='고정 예시 미리 보기 · 본문 대비 '+contrast(t.text,t.card).toFixed(2)+':1 · 모든 필수 대비 4.5:1 이상 통과'; preview.hidden=false;
          message('검사를 통과했어요. 미리 본 테마 적용을 누르면 저장해요.');
        }
        if(action==='confirm' && previewTheme && previewOwner===ownership) { const epoch=ownership; previous=JSON.parse(JSON.stringify(current)); previousOwner=epoch; await save({id:'custom',theme:previewTheme}); if(epoch===ownership) { undo.hidden=false; preview.hidden=true; } }
        if(action==='undo' && previous && previousOwner===ownership) { const value=previous; previous=null; previousOwner=-1; undo.hidden=true; await save(value); }
        if(action==='export') { const theme=current.id==='custom'?current.theme:portable(themes.find(t=>t.id===current.id)); area.value=JSON.stringify(theme,null,2); section.querySelector('details').open=true; area.focus(); area.select(); message('아래 JSON을 복사해 다른 기기에 가져올 수 있어요. 기본 테마 내보내기는 읽기 쉬운 대비를 보완한 색상이에요.'); }
      } catch(e) { message('적용하지 않았어요: '+e.message); }
    });
  }
  const api={themes,validate,contrast,connect,save,apply,normalize,prompt,exportTheme:()=>portable(current.id==='custom'?current.theme:themes.find(t=>t.id===current.id))};
  if(typeof module==='object' && module.exports) module.exports=api;
  root.OharuThemes=api;
  if(root.document) { restore(); if(root.document.readyState==='loading') root.document.addEventListener('DOMContentLoaded',mount); else mount(); root.addEventListener('storage',e=>{if(e.key===storageKey()) restore();}); root.addEventListener('focus',refresh); }
})(typeof window!=='undefined'?window:globalThis);

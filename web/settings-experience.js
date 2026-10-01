(function(root){
  'use strict';
  if(!root.document)return;
  const endpoint='https://tcaghsjndfaxlsgaqrdi.supabase.co/functions/v1/mcp';
  const claudeInstall='https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=Oharu&connectorUrl='+encodeURIComponent(endpoint);
  // Provider links are navigation, not proof of a connection. OAuth activation is a separate reviewed change.
  const providers={chatgpt:{name:'ChatGPT',available:false,installUrl:null},claude:{name:'Claude',available:false,installUrl:claudeInstall}};
  const english=()=>root.document.documentElement.lang!=='ko'&&!!root.document.documentElement.lang;
  const copy=(ko,en)=>english()?en:ko;
  function localize(){
    root.document.querySelectorAll('[data-settings-ko]').forEach(el=>el.textContent=english()?el.dataset.settingsEn:el.dataset.settingsKo);
    const title=root.document.getElementById('setMcpTitle');if(title)title.textContent=copy('고급 연결 설정 · MCP와 개인 토큰','Advanced connections · MCP and personal tokens');
    const account=root.document.getElementById('setAccountTitle');if(account)account.textContent=copy('계정 관리','Account management');
    root.OharuThemes?.localize?.();root.OharuThemeNavigation?.localize?.();root.OharuReminders?.localize?.();
  }
  function mount(){
    const view=root.document.getElementById('setView');if(!view||root.document.getElementById('setAIConnections'))return;
    const themes=root.document.getElementById('setThemes');
    const ai=root.document.createElement('section');ai.id='setAIConnections';ai.className='set-card settings-ai';
    ai.innerHTML=`<div class="set-title" data-settings-ko="AI 연결" data-settings-en="AI connections"></div><div class="settings-body"><p class="settings-note" data-settings-ko="연결이 준비되면 AI에서 할 일을 읽고 추가할 수 있어요. 완료 처리는 따로 허용한 경우에만 가능해요. 현재 직접 연결은 준비 중이에요." data-settings-en="When connection is ready, your AI can read and add tasks. Completing tasks requires separate permission. Direct connection is currently in preparation."></p><div class="ai-provider-list"></div><div class="ai-connection-guide" hidden role="region" aria-live="polite"></div></div>`;
    const list=ai.querySelector('.ai-provider-list'),guide=ai.querySelector('.ai-connection-guide');
    for(const [id,p] of Object.entries(providers)){
      const item=root.document.createElement('div');item.className='ai-provider';
      const button=root.document.createElement('button');button.type='button';button.className='ai-provider-button';button.dataset.provider=id;button.dataset.settingsKo=p.name+' 연결 안내';button.dataset.settingsEn=p.name+' connection guide';button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','oharu-ai-guide');
      const status=root.document.createElement('span');status.className='ai-provider-status';status.dataset.connectionState='preparing';status.dataset.settingsKo='직접 연결 준비 중';status.dataset.settingsEn='Direct connection in preparation';
      button.onclick=()=>{
        list.querySelectorAll('button').forEach(b=>b.setAttribute('aria-expanded',String(b===button)));
        guide.replaceChildren();guide.hidden=false;guide.id='oharu-ai-guide';
        const heading=root.document.createElement('strong');heading.textContent=copy(p.name+' 연결 안내',p.name+' connection guide');
        const note=root.document.createElement('p');note.className='settings-note';note.textContent=copy('할 일 읽기·추가 연결을 준비하고 있어요. 실제 설치 주소와 계정 인증·동의가 준비되면 여기에서 안내해 드릴게요. 아직 연결되지 않았어요.','Read and add task connections are in preparation. The installation link and account authorization will be available here when ready. Oharu is not connected yet.');
        const install=root.document.createElement('button');install.type='button';install.className='set-btn';install.disabled=true;install.textContent=copy(p.name+' 연결 준비 중',p.name+' connection in preparation');
        guide.append(heading,note,install);
        if(p.installUrl){const detail=root.document.createElement('details');detail.className='settings-detail';const summary=root.document.createElement('summary');summary.textContent=copy('연결 화면 미리 보기','Preview the connection screen');const description=root.document.createElement('p');description.className='settings-note';description.textContent=copy('Claude의 추가 화면에 오하루 주소를 입력해 줍니다. 인증 준비가 끝난 뒤 실제 연결과 동의를 완료해야 해요. 화면을 열어도 연결된 상태가 되지 않아요.','Opens Claude’s add connector screen with Oharu filled in. Authentication must be ready before you complete connection and consent. Opening this screen does not connect Oharu.');const link=root.document.createElement('a');link.href=p.installUrl;link.target='_blank';link.rel='noopener noreferrer';link.className='set-btn';link.textContent=copy('Claude 연결 화면 열기','Open Claude connection screen');detail.append(summary,description,link);guide.append(detail);}
        guide.scrollIntoView({block:'nearest',behavior:'auto'});
      };
      item.append(button,status);list.append(item);
    }
    if(themes)themes.after(ai);else view.prepend(ai);
    const mcp=root.document.getElementById('setMcp');if(mcp){const advanced=root.document.createElement('details');advanced.className='set-card settings-advanced';const summary=root.document.createElement('summary');summary.dataset.settingsKo='고급 연결 설정';summary.dataset.settingsEn='Advanced connection settings';mcp.before(advanced);advanced.append(summary,mcp);mcp.classList.remove('set-card');}
    const account=root.document.getElementById('setAccount');if(account){const card=account.closest('.set-card');if(card){card.id='setAccountManagement';view.append(card);const note=root.document.createElement('p');note.className='settings-note settings-body';note.dataset.settingsKo='로그인 정보, 로그아웃과 계정 삭제를 관리해요.';note.dataset.settingsEn='Manage sign-in, sign-out and account deletion.';card.append(note);}}
    const widget=root.document.getElementById('setApp');if(widget){const note=root.document.createElement('p');note.className='settings-note settings-body';note.dataset.settingsKo='항상 위에 고정하면 다른 창 위에서 볼 수 있어요. 앱 종료는 트레이 실행도 끝내요.';note.dataset.settingsEn='Keep Oharu above other windows. Quit also stops the tray app.';widget.append(note);}
    localize();new MutationObserver(localize).observe(root.document.documentElement,{attributes:true,attributeFilter:['lang']});
  }
  root.OharuSettings={localize,connectionState:provider=>providers[provider]?'preparing':'unsupported',claudeInstallUrl:claudeInstall};
  if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',mount);else mount();
})(typeof window!=='undefined'?window:globalThis);

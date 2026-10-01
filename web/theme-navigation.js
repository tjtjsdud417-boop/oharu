(function(root){
  'use strict';
  const doc=root.document;if(!doc)return;
  const english=()=>doc.documentElement.lang!=='ko'&&!!doc.documentElement.lang;
  const text=(ko,en)=>english()?en:ko;
  let api=null;
  function mount(){
    const view=doc.getElementById('setView'),host=doc.getElementById('setThemes'),engine=doc.getElementById('oharu-theme-settings');
    if(!view||!host||!engine||doc.getElementById('themeDetailView'))return;
    const galleryDetails=engine.querySelector('#oharu-theme-panel'),aiDetails=engine.querySelector('#oharu-theme-ai');
    const art=galleryDetails.querySelector('.theme-entry-art');
    const entry=doc.createElement('button');entry.type='button';entry.id='themeSettingsEntry';entry.className='theme-entry theme-settings-entry';
    entry.setAttribute('aria-controls','themeDetailView');entry.setAttribute('aria-expanded','false');
    entry.innerHTML='<span><strong data-theme-nav-ko="테마 설정" data-theme-nav-en="Theme settings"></strong><span data-theme-nav-ko="갤러리와 AI 사용자 테마" data-theme-nav-en="Gallery and custom AI themes"></span></span><span class="theme-entry-arrow" aria-hidden="true">›</span>';
    entry.prepend(art);
    const detail=doc.createElement('section');detail.id='themeDetailView';detail.hidden=true;
    detail.innerHTML='<div class="theme-detail-head"><button type="button" id="themeSettingsBack" class="set-btn" data-theme-nav-ko="‹ 설정으로" data-theme-nav-en="‹ Settings"></button><h2 id="themeDetailTitle" tabindex="-1" data-theme-nav-ko="테마 설정" data-theme-nav-en="Theme settings"></h2></div><div class="theme-tabs" role="tablist" aria-label="Theme settings"><button type="button" id="themeGalleryTab" role="tab" aria-controls="oharu-theme-panel" data-theme-nav-ko="테마 갤러리" data-theme-nav-en="Theme gallery"></button><button type="button" id="themeAITab" role="tab" aria-controls="oharu-theme-ai" data-theme-nav-ko="AI 사용자 테마" data-theme-nav-en="Custom AI theme"></button></div>';
    function panel(details,id,label){const node=doc.createElement('div');node.id=id;node.setAttribute('role','tabpanel');node.setAttribute('aria-labelledby',label);node.append(details.querySelector('.theme-panel-content'));details.replaceWith(node);return node;}
    const gallery=panel(galleryDetails,'oharu-theme-panel','themeGalleryTab'),ai=panel(aiDetails,'oharu-theme-ai','themeAITab');
    detail.append(engine);host.append(entry);host.after(detail);
    const tabs=[detail.querySelector('#themeGalleryTab'),detail.querySelector('#themeAITab')];
    let opened=false,tab='gallery',aiAvailable=true,settingsScroll=0,detailScroll=0,waitingBack=false;
    let returnClick=null;
    // A second tap at the old Back position must not activate the newly exposed
    // entry (or leave iOS settings). Other positions and keyboard input still work.
    doc.addEventListener('click',event=>{
      const id=event.target.closest('button')?.id;
      if(!event.isTrusted||event.detail===0)return;
      const now=root.performance.now();
      if(returnClick&&now-returnClick.time<500&&Math.hypot(event.clientX-returnClick.x,event.clientY-returnClick.y)<8){
        event.preventDefault();event.stopImmediatePropagation();return;
      }
      if(opened&&['themeSettingsBack','settingsBackBtn'].includes(id))returnClick={time:now,x:event.clientX,y:event.clientY};
    },true);
    const nativeTitle=doc.getElementById('settingsTitle');const normalTitle=nativeTitle?.textContent;
    const native=()=>doc.documentElement.classList.contains('ios-app');
    const scroller=()=>doc.getElementById('iosMainScroll')||doc.scrollingElement;
    const readScroll=()=>scroller()?.scrollTop||0;
    const scroll=value=>{const el=scroller();if(el)el.scrollTop=value;};
    function localize(){
      [entry,detail].forEach(container=>container.querySelectorAll('[data-theme-nav-ko]').forEach(node=>node.textContent=english()?node.dataset.themeNavEn:node.dataset.themeNavKo));
      detail.querySelector('[role=tablist]').setAttribute('aria-label',text('테마 설정','Theme settings'));
      if(nativeTitle&&native())nativeTitle.textContent=opened?text('테마 설정','Theme settings'):normalTitle;
    }
    function choose(value,focus=false){
      tab=value==='ai'&&aiAvailable?'ai':'gallery';gallery.hidden=tab!=='gallery';ai.hidden=tab!=='ai';
      tabs.forEach((button,i)=>{const selected=(i===1?'ai':'gallery')===tab;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;});
      if(focus)tabs[tab==='ai'?1:0].focus({preventScroll:true});
    }
    function show(value){
      if(value)returnClick=null;
      opened=value;detail.hidden=!value;view.classList.toggle('theme-detail-open',value);entry.setAttribute('aria-expanded',String(value));localize();
    }
    function open(){
      if(opened)return;settingsScroll=readScroll();
      if(root.OharuThemeRoute?.enter)root.OharuThemeRoute.enter();
      else root.history.pushState({...root.history.state,oharuThemeDetail:true},'',root.location.href);
      show(true);scroll(detailScroll);(native()?nativeTitle:detail.querySelector('#themeDetailTitle'))?.focus({preventScroll:true});
    }
    function back(){
      if(!opened||waitingBack)return;detailScroll=readScroll();
      if(root.history.state?.oharuThemeDetail){waitingBack=true;root.history.back();}
      else{show(false);scroll(settingsScroll);entry.focus({preventScroll:true});}
    }
    entry.onclick=open;detail.querySelector('#themeSettingsBack').onclick=back;
    tabs.forEach((button,i)=>{button.onclick=()=>{choose(i===1?'ai':'gallery');scroll(0);};button.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const value=event.key==='Home'?'gallery':event.key==='End'?(aiAvailable?'ai':'gallery'):tab==='gallery'&&aiAvailable?'ai':'gallery';choose(value,true);scroll(0);};});
    root.addEventListener('popstate',event=>{
      waitingBack=false;
      const target=!!event.state?.oharuThemeDetail&&(!event.state.oharuIOS||event.state.screen==='set');
      if(!native()){
        if(opened&&!target)detailScroll=readScroll();
        if(target)root.OharuThemeRoute?.restore?.();
        show(target);
        if(!view.hidden){scroll(target?detailScroll:settingsScroll);if(!target)entry.focus({preventScroll:true});}
      }
      // iOS route restoration calls viewChanged before restoring its own saved scroll.
    });
    root.addEventListener('keydown',event=>{if(event.key!=='Escape'||!opened||doc.querySelector('dialog[open]')||doc.getElementById('authView')?.hidden===false)return;event.preventDefault();event.stopImmediatePropagation();back();},true);
    api={open,back,localize,selectTab:choose,isOpen:()=>opened,beforeRestore(){if(opened)detailScroll=readScroll();},setAIAvailable(value){aiAvailable=!!value;tabs[1].hidden=!aiAvailable;choose(tab);},viewChanged(value){
      if(value!=='set'){
        if(opened)detailScroll=readScroll();show(false);
        if(!native()&&root.history.state?.oharuThemeDetail)root.history.replaceState({...root.history.state,oharuThemeDetail:false},'',root.location.href);
      }else show(!!root.history.state?.oharuThemeDetail);
    }};
    root.OharuThemeNavigation=api;choose(tab);localize();
  }
  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',mount);else mount();
})(typeof window!=='undefined'?window:globalThis);

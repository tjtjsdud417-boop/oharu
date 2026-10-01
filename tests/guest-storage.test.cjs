const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
for(const file of ['../web/index.html','../mobile/assets/web/app.html']){
  test(`${file}: optimistic today/calendar additions save each ID once without repository aliasing`,async()=>{
    const html=fs.readFileSync(require.resolve(file),'utf8');
    const start=html.indexOf('function localRepo() {');
    const end=html.indexOf('function cloudRepo()',start);
    const data=new Map();
    const context=vm.createContext({window:{},todayStr:()=> '2026-09-30',localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)}});
    vm.runInContext(html.slice(start,end)+';globalThis.repo=localRepo();',context);
    const ui=await context.repo.load();
    for(const [id,date] of [['A','2026-09-30'],['B','2026-09-30'],['calendar','2026-10-01']]){
      const todo={id,text:id,todoDate:date,done:false};
      ui.push(todo);await context.repo.add(todo);
      const saved=JSON.parse(data.get('oneul.v3')).todos;
      assert.equal(saved.length,ui.length);assert.equal(new Set(saved.map(x=>x.id)).size,ui.length);
    }
    ui[0].text='unsaved edit';
    assert.equal((await context.repo.load())[0].text,'A');
    const beforeReload=data.get('oneul.v3');
    vm.runInContext('globalThis.repo=localRepo();',context);
    assert.equal((await context.repo.load()).length,3);assert.equal(data.get('oneul.v3'),beforeReload);
    const edited={...ui[1],done:true};
    await context.repo.update(edited);
    edited.text='unsaved post-update mutation';
    await context.repo.add({id:'next',text:'next',todoDate:'2026-09-30',done:false});
    const saved=JSON.parse(data.get('oneul.v3')).todos;
    assert.equal(saved.length,4);assert.equal(saved.find(x=>x.id==='B').done,true);
    assert.equal(saved.find(x=>x.id==='B').text,'B');
  });
}

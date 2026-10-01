const {validateMessage} = require('./reminders.cjs');
function widgetSnapshot(raw, now = Date.now()) {
  const m = validateMessage(raw, 'oharu:widgets:sync');
  if (m.type !== 'oharu:widgets:sync') throw Error('invalid-widget-message');
  return m.enabled ? m.tasks.filter(t => !t.done && t.dueAt > now).sort((a,b) => a.dueAt-b.dueAt || a.id.localeCompare(b.id)).slice(0,60).map(t => ({id:t.id,title:t.title.replace(/[\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]/g,' ').slice(0,160),dueAt:t.dueAt})) : [];
}
function createWidgetService(module) {
  let queue=Promise.resolve();
  return {handle(raw) {
    let snapshot, requestId;
    try {snapshot=widgetSnapshot(raw);requestId=JSON.parse(raw).requestId;} catch {return Promise.resolve({status:'invalid-message'});}
    const result=queue.then(async()=>{
      if (!module?.updateSnapshot) return {requestId,status:'unavailable'};
      await module.updateSnapshot(JSON.stringify(snapshot));
      return {requestId,status:'updated',count:snapshot.length};
    }).catch(()=>({requestId,status:'unavailable'}));
    queue=result;
    return result;
  }};
}
module.exports={widgetSnapshot,createWidgetService};

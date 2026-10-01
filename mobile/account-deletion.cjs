// Fixed Oharu backend only. No URL/owner/key is accepted from the WebView.
const ENDPOINT = "https://tcaghsjndfaxlsgaqrdi.supabase.co/functions/v1/delete-account";
const CODES = new Set(['authentication_required','authentication_failed','invalid_body','body_too_large','json_required','deletion_not_enabled','mfa_reauthentication_unsupported','password_reauthentication_unsupported','reauthentication_failed','storage_objects_block_deletion','storage_verification_required','storage_verification_failed','account_deletion_unconfirmed','origin_denied','rate_limited']);
function validate(raw) {
  if(typeof raw!=='string'||raw.length>16384)throw Error('invalid');
  const m=JSON.parse(raw);
  if(!m||Array.isArray(m)||Object.keys(m).sort().join(',')!=='accessToken,confirmation,password,requestId,type')throw Error('invalid');
  if(m.type!=='oharu:account:delete'||typeof m.requestId!=='string'||! /^[\w:.-]{1,100}$/.test(m.requestId)||typeof m.accessToken!=='string'||m.accessToken.length<1||m.accessToken.length>8192||/[\r\n]/.test(m.accessToken)||typeof m.password!=='string'||m.password.length<1||m.password.length>1024||m.confirmation!=='DELETE')throw Error('invalid');
  return m;
}
function createAccountDeletionService(fetchImpl=fetch, timeoutMs=20000) {
  let busy=false;const seen=new Set();
  return {async handle(raw) {
    let m;try{m=validate(raw)}catch{return {httpStatus:400,deleted:false,code:'invalid_request'}}
    const reply=(httpStatus,deleted=false,code='delete_failed')=>({requestId:m.requestId,httpStatus,deleted,code});
    if(busy||seen.has(m.requestId))return reply(409,false,'request_in_progress');
    busy=true;seen.add(m.requestId);if(seen.size>100)seen.delete(seen.values().next().value);
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try {
      const response=await fetchImpl(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+m.accessToken},body:JSON.stringify({password:m.password,confirmation:'DELETE'}),signal:controller.signal});
      const body=await response.json().catch(()=>null);
      if(response.ok&&body?.deleted===true)return reply(response.status,true,'deleted');
      return reply(response.status,false,CODES.has(body?.code)?body.code:'delete_failed');
    } catch {return reply(controller.signal.aborted?504:503,false,controller.signal.aborted?'request_timeout':'network_error')}
    finally {clearTimeout(timer);busy=false;m.password='';m.accessToken='';}
  }};
}
module.exports={createAccountDeletionService};

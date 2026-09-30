'use strict';
// Offline-testable protocol only. No credentials, network calls, timers or registration.
const GRACE_MS = 300000;
const id = value => typeof value === 'string' && /^[\w-]{1,128}$/.test(value);
function subscription(value, allowedHosts) {
  if (!value || !Array.isArray(allowedHosts) || !allowedHosts.length) throw Error('unconfigured-provider');
  const url = new URL(value.endpoint);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash || !allowedHosts.includes(url.hostname)) throw Error('invalid-endpoint');
  const keys = value.keys;
  if (!keys || !/^[\w-]{87}$/.test(keys.p256dh) || !/^[\w-]{22}$/.test(keys.auth)) throw Error('invalid-subscription-key');
  // These keys and the endpoint are confidential capability data; never log them.
  return {endpoint:url.href, keys:{p256dh:keys.p256dh,auth:keys.auth}};
}
function job(value) {
  if (!value || !id(value.owner) || !id(value.todoId) || !id(value.subscriptionId) || !Number.isSafeInteger(value.revision) || value.revision < 1 || !Number.isSafeInteger(value.dueAt) || value.dueAt < 0) throw Error('invalid-job');
  return {owner:value.owner,todoId:value.todoId,subscriptionId:value.subscriptionId,revision:value.revision,dueAt:value.dueAt};
}
function eligible(raw, current, now) {
  const j=job(raw);
  return !!current && current.owner===j.owner && current.todoId===j.todoId && current.subscriptionId===j.subscriptionId && current.revision===j.revision && current.dueAt===j.dueAt && current.enabled===true && current.done===false && current.deleted===false && current.dueAt<=now && current.dueAt>now-GRACE_MS;
}
function providerResult(status) {
  if (status>=200 && status<300) return 'accepted';
  if (status===404 || status===410) return 'expire-subscription';
  if (status===429 || status>=500) return 'retry-with-backoff';
  return 'configuration-error'; // 401/403 do not delete a live subscription.
}
async function dispatch(raw, ports, now=Date.now()) {
  const j=job(raw);
  // claimCurrent MUST atomically compare current owner/revision/due/state and acquire
  // a durable lease keyed by subscriptionId+todoId+revision+dueAt. In-memory is not sufficient.
  const lease=await ports.claimCurrent(j, now, GRACE_MS);
  if (!lease) return 'stale-or-claimed';
  if (!id(lease.deliveryId)) throw Error('invalid-delivery-id');
  if (!eligible(j,await ports.current(j),now)) {await ports.finish(lease,'stale');return 'stale';}
  try {
    const status=await ports.send(lease,{v:1,deliveryId:lease.deliveryId}, {TTL:Math.max(0,Math.ceil((j.dueAt+GRACE_MS-now)/1000)),urgency:'high'});
    const result=providerResult(status);
    await ports.finish(lease,result);
    return result;
  } catch {
    // Provider acceptance may have occurred before a network timeout. The same
    // delivery ID must be reused; display side durably claims it before showing.
    await ports.finish(lease,'retry-with-backoff');return 'retry-with-backoff';
  }
}
async function receive(raw, ports, now=Date.now()) {
  if (!raw || Object.keys(raw).sort().join(',')!=='deliveryId,v' || raw.v!==1 || !id(raw.deliveryId)) return 'invalid';
  let state;
  try { state=await ports.resolveCurrent(raw.deliveryId); } catch {return 'unavailable';}
  // Authenticated server resolution rechecks logout/revocation/edit/completion.
  // Never display cached todo content when this check is unavailable/offline.
  if (!state || !eligible(state,state,now) || !await ports.claimDisplay(raw.deliveryId)) return 'stale-or-seen';
  await ports.show('오하루 할 일 알림',{body:'예정된 할 일이 있어요. 오하루에서 확인해 주세요.',tag:'oharu-push:'+raw.deliveryId,data:{path:'/'}});
  return 'shown';
}
module.exports={GRACE_MS,subscription,job,eligible,providerResult,dispatch,receive};

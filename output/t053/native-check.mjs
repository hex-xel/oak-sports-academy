import WebSocket from 'ws';
const targets = await (await fetch('http://127.0.0.1:8081/json/list')).json();
const target = targets.find(t => t.title.includes('host.exp.exponent'));
if (!target) throw new Error('Native debugger unavailable');
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.addEventListener('open', resolve); socket.addEventListener('error', reject); });
const expression = process.argv[2] === 'concurrent' ? `(async()=>{
 const modules=Array.from(__r.getModules().values());
 const client=modules.map(m=>m.publicModule?.exports).find(e=>e?.api&&e?.createApiClient)?.api;
 if(!client)return {available:false};
 const start=performance.now();await client.session();const confirmationMs=performance.now()-start;
 await client.logout();
 const results=await Promise.allSettled([client.session(),client.session(),client.session()]);
 return {available:true,confirmationMs,statuses:results.map(r=>r.status==='rejected'?r.reason.status:'unexpected-success')};
})()` : `JSON.stringify({metro:typeof __r,modules:typeof __r.getModules})`;
const result = await new Promise((resolve,reject)=>{
 const timer=setTimeout(()=>reject(new Error('Native check timeout')),25000);
 socket.addEventListener('message',e=>{const msg=JSON.parse(String(e.data));if(msg.id===1){clearTimeout(timer);resolve(msg.result?.result?.value ?? {evaluationFailed:true});}});
 socket.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{expression,awaitPromise:true,returnByValue:true}}));
});
console.log(JSON.stringify(result));socket.close();

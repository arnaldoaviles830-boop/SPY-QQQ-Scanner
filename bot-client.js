(()=>{
 'use strict';const $=id=>document.getElementById(id),STORE='scanner.bot.v454';let prefs={},busy=false,registration;
 try{prefs=JSON.parse(localStorage.getItem(STORE)||'{}')}catch{}
 const say=x=>{$('botStatus').textContent=x};
 const save=()=>localStorage.setItem(STORE,JSON.stringify(prefs));
 $('botUrl').value=prefs.url||'';$('botSymbols').value=(prefs.symbols||['PFE','T','BAC','KO','CSCO','NDAQ','F']).join(',');
 if(prefs.url)globalThis.SCANNER_BOT_URL=prefs.url;
 const watch=()=>[...new Set($('botSymbols').value.toUpperCase().split(/[ ,;]+/).filter(Boolean))];
 function base(){const u=new URL($('botUrl').value.trim()||prefs.url);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.pathname!=='/')throw new Error('Usa solo la dirección HTTPS del Worker, sin rutas ni claves');return u.origin}
 async function api(path,body,enroll=false){const response=await fetch((prefs.url||base())+path,{method:body===undefined?'GET':'POST',headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(enroll?{Authorization:'Bearer '+$('botKey').value.trim()}:prefs.token?{Authorization:'Bearer '+prefs.token}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000),cache:'no-store'});const data=await response.json();if(!response.ok)throw new Error(data.error||`HTTP ${response.status}`);return data}
 const un64=s=>Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
 async function serviceWorker(){if(!('serviceWorker'in navigator)||!('PushManager'in window))throw new Error('Notificaciones web no disponibles en este navegador');registration=await navigator.serviceWorker.register('./sw.js',{scope:'./'});await navigator.serviceWorker.ready;return registration}
 function append(parent,tag,text,cls=''){const e=document.createElement(tag);e.textContent=text;if(cls)e.className=cls;parent.append(e);return e}
 async function status(){
  if(!prefs.token||busy)return;busy=true;
  try{const data=await api('/status');
   globalThis.SCANNER_RISK=data.risk||null;globalThis.SCANNER_BOT_URL=prefs.url;
   const hb=data.heartbeat,age=hb?Date.now()-hb.at:Infinity;
   say(hb?`${age>5*60000?'Servidor sin revisión reciente':'Alertas activadas'} · ${hb.status} · ${new Date(hb.at).toLocaleString('es-PR')}`:'Dispositivo activado; esperando primer ciclo programado.');
   const r=data.risk;$('botCoverage').textContent=r?`${Date.now()-r.at>180000?'LECTURA ATRASADA · ':''}${r.level}. ${r.reasons.join('; ')}. ${r.note}`:'Filtro de noticias y riesgo todavía sin evaluar.';
   const root=$('botFeed');root.replaceChildren();
   if(data.delivery&&!data.delivery.accepted)append(root,'p',`Último envío con error ${data.delivery.status}; revisa la prueba de notificaciones.`,'sub');
   if(r?.calendar)append(root,'p',`FED: ${r.calendar.verified?'calendario verificado':'calendario no verificable'} · próxima decisión ${r.calendar.next||'sin verificar'}. ${r.calendar.note||r.calendar.reason||''}`,'sub');
   for(const m of r?.markets||[])append(root,'p',`${m.symbol}: ${m.reason}${m.volumeRatio!==null&&m.volumeRatio!==undefined?' · volumen relativo '+m.volumeRatio.toFixed(1)+'×':''}`,'sub');
   for(const n of r?.news?.flags||[])append(root,'p',`${n.category} · ${n.title} · revisión preventiva hasta ${new Date(n.pauseUntil).toLocaleString('es-PR')}; impacto sin confirmar.`,'sub');

   for(const s of data.snapshots||[]){const card=append(root,'article','','bot-item');append(card,'b',s.symbol+' · '+s.status);append(card,'p',s.reason,'sub');if(s.patterns){const p=s.patterns;append(card,'p',p.verified?p.reason:p.reason,'sub');if(p.verified){append(card,'p','Soportes: '+p.supports.map(l=>l.level.toFixed(2)+' ('+l.touches+' contactos)').join(', ')+' · Resistencias: '+p.resistances.map(l=>l.level.toFixed(2)+' ('+l.touches+' contactos)').join(', '),'sub');for(const f of p.patterns)append(card,'p',`${f.name} · ${f.status} · nivel ${f.level.toFixed(2)} · invalidación ${f.invalidation.toFixed(2)} · ${f.volumeConfirmed?'volumen acompaña':'volumen sin confirmar'}`,'sub');if(!p.patterns.length)append(card,'p','Sin figura apta según las reglas actuales.','sub');}}if(s.signal){const v=s.signal;append(card,'p',`${Date.now()>v.validUntil?'SEÑAL CADUCADA · ':''}${v.name} · ${v.dte} DTE · ${v.expiry}`);for(const l of v.legs)append(card,'p',`${l.role==='long'?'Comprar':'Vender'} ${l.side} ${l.strike}`,'sub');append(card,'p',`Prima indicativa $${(v.premium*100).toFixed(2)} · pérdida máxima $${v.risk.toFixed(2)} · ganancia máxima $${v.gain.toFixed(2)}, antes de costos. ${v.probability!==null?v.probability+'% teórico al vencimiento, no tasa de éxito.':''}`,'sub');append(card,'p',v.gamma||'','sub');}}
   for(const a of data.alerts||[]){const card=append(root,'article','','bot-item');append(card,'b',a.title);append(card,'p',a.body,'sub');append(card,'small',new Date(a.at).toLocaleString('es-PR'));}
   if(r?.news){append(root,'h2','Noticias revisadas');append(root,'p',r.news.note,'sub');for(const n of r.news.items.slice(0,10)){const card=append(root,'article','','bot-item'),link=append(card,'a',n.title);try{const u=new URL(n.url);if(u.protocol==='https:'){link.href=u.href;link.target='_blank';link.rel='noopener noreferrer'}}catch{}append(card,'p',(n.category||'INFORMATIVA')+' · '+n.source+' · '+new Date(n.at).toLocaleString('es-PR'),'sub')}}
   // Re-render current analysis after receiving the shared risk gate.
   if(typeof render==='function'&&typeof state!=='undefined'&&state.rows.length)render();
  }catch(e){globalThis.SCANNER_RISK=null;say('No se pudo consultar el bot: '+e.message+'. El análisis local sigue disponible; filtro de riesgo sin verificar.')}finally{busy=false}
 }
 $('botSave').onclick=()=>{try{const url=base();if(prefs.url&&url!==prefs.url&&prefs.token)throw new Error('Desactiva las alertas antes de cambiar de servidor');prefs.url=url;save();say('Dirección guardada. Abre la app desde Inicio y pulsa Activar alertas.')}catch(e){say(e.message)}};
 $('botEnable').onclick=async()=>{
  const button=$('botEnable');button.disabled=true;
  try{
   if(/iPhone|iPad|iPod/.test(navigator.userAgent)&&!navigator.standalone&&!matchMedia('(display-mode: standalone)').matches)throw new Error('En Safari: Compartir → Añadir a Inicio. Abre el icono nuevo y activa las alertas desde allí.');
   prefs.url=base();const selected=watch();if(selected.length>8)throw new Error('Máximo 8 acciones β');
   // Permission must follow the tap, before network operations.
   const permission=await Notification.requestPermission();if(permission!=='granted')throw new Error('Permiso no concedido. Revisa Ajustes → Notificaciones.');
   const reg=await serviceWorker(),config=await api('/config');
   let sub=await reg.pushManager.getSubscription();if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:un64(config.publicKey)});
   if(!prefs.token){if(!$('botKey').value.trim())throw new Error('Introduce la clave de activación creada para tu servidor (solo esta vez).');const result=await api('/subscribe',{subscription:sub.toJSON(),symbols:selected},true);prefs.token=result.token;prefs.id=result.id;}
   prefs.symbols=selected;save();$('botKey').value='';$('botSetup').open=false;await status();
  }catch(e){say(e.message)}finally{button.disabled=false}
 };
 $('botTest').onclick=async()=>{try{if(!prefs.token)throw new Error('Activa primero las alertas');await api('/test',{});say('Prueba aceptada por el servicio push. Comprueba la notificación en el iPhone.')}catch(e){say(e.message)}};
 $('botDisable').onclick=async()=>{try{if(prefs.token)await api('/unsubscribe',{});const reg=await navigator.serviceWorker?.getRegistration('./'),sub=await reg?.pushManager.getSubscription();if(sub)await sub.unsubscribe();delete prefs.token;delete prefs.id;save();globalThis.SCANNER_RISK=null;say('Alertas desactivadas en este dispositivo.')}catch(e){say('No se confirmó la desactivación: '+e.message)}};
 $('botWatch').onclick=async()=>{try{const selected=watch();if(!prefs.token)throw new Error('Activa primero las alertas');await api('/watch',{symbols:selected});prefs.symbols=selected;save();say('Lista de vigilancia guardada en el bot');await status()}catch(e){say(e.message)}};
 if(prefs.token)status();else $('botSetup').open=true;
 setInterval(()=>{if(!document.hidden)status()},60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)status()});
})();

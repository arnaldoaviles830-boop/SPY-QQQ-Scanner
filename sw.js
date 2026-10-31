'use strict';
self.addEventListener('install',event=>{self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(self.clients.claim())});
// No caching of prices, chains, news, subscriptions, or old app versions.
self.addEventListener('push',event=>{
 let message={title:'Market Options Scanner',body:'Hay una actualización; abre la app para verificarla.',tag:'scanner-update'};
 try{if(event.data)message={...message,...event.data.json()}}catch{}
 const target=new URL('./index.html',self.registration.scope);try{const candidate=new URL(message.url);if(candidate.origin===self.location.origin&&candidate.pathname.startsWith(new URL(self.registration.scope).pathname))target.href=candidate.href}catch{}
 event.waitUntil(self.registration.showNotification(String(message.title).slice(0,120),{body:String(message.body).slice(0,700),icon:'./icon-192.png',badge:'./icon-192.png',tag:String(message.tag||'scanner-update'),data:{url:target.href}}));
});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil((async()=>{const url=event.notification.data?.url||new URL('./index.html',self.registration.scope).href;const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});const match=windows.find(w=>w.url===url);if(match)return match.focus();return self.clients.openWindow(url)})())});

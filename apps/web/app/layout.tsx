import type { ReactNode } from 'react';
import './globals.css';
import Diagnostic from './Diagnostic';
export const metadata = { title: 'Quérix', description: 'Formation et aide aux protocoles' };

// Diagnostic temporaire : affiche à l'écran toute erreur JavaScript (utile sur téléphone, sans console).
// Le badge passe au vert quand React a démarré (voir Diagnostic dans page.tsx).
const VERSION = process.env.NEXT_PUBLIC_COMMIT || 'local';
const diag = `(function(){var box;function show(m){try{if(!box){box=document.createElement('div');box.id='qx-err';box.style.cssText='position:fixed;left:8px;right:8px;top:8px;z-index:99999;background:#b00020;color:#fff;font:13px/1.35 monospace;padding:10px;border-radius:10px;white-space:pre-wrap;max-height:45vh;overflow:auto';(document.body||document.documentElement).appendChild(box);}box.textContent+=m+'\\n';}catch(e){}}
window.addEventListener('error',function(e){var t=e.target;if(t&&t!==window&&(t.src||t.href)){show('Ressource introuvable : '+(t.src||t.href));return;}show('Erreur JS : '+e.message+' @ '+(e.filename||'')+':'+(e.lineno||''));},true);
window.addEventListener('unhandledrejection',function(e){show('Promesse rejetée : '+(e.reason&&(e.reason.stack||e.reason.message)||e.reason));});
setTimeout(function(){if(!document.documentElement.dataset.ready)show('JavaScript non démarré après 8 s ('+navigator.userAgent+')');},8000);})();`;

export default function Layout({children}:{children:ReactNode}) {
  return <html lang="fr-CA"><head><script dangerouslySetInnerHTML={{__html: diag}}/></head>
    <body>{children}<Diagnostic/><div id="qx-ver" style={{position:'fixed',right:6,bottom:2,zIndex:9999,font:'10px monospace',opacity:.7,pointerEvents:'none',color:'#a33'}}>v{VERSION} · JS ?</div></body></html>;
}

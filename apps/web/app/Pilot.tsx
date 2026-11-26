'use client';
import {useState,useEffect,useRef} from 'react';
import GameView from './GameView';
import {evaluate} from '../../../packages/decision-engine/engine.mjs';
import graph from '../../../training/pilot-fictional.json';
type Mode='professional'|'hybrid'|'immersive';
export default function Pilot({initialMode='professional'}:{initialMode?:Mode}){
 const [mode,setMode]=useState<Mode>(initialMode);
 const [history,setHistory]=useState<{id:string;option:string}[]>([]);
 const [position,setPosition]=useState({x:0,z:0});
 const canvas=useRef<HTMLCanvasElement>(null);
 const result=evaluate(graph,Object.fromEntries(history.map(h=>[h.id,h.option])));
 const choose=(option:string)=>{if('questionId' in result && result.options.includes(option)){setHistory(old=>[...old,{id:result.questionId,option}]);setPosition({x:0,z:0});}};
 const move=(dx:number,dz:number)=>setPosition(p=>({x:Math.max(-2,Math.min(2,p.x+dx)),z:Math.max(0,Math.min(6,p.z+dz))}));
 useEffect(()=>{if(mode==='professional')return;const key=(e:KeyboardEvent)=>{if(e.target instanceof HTMLButtonElement||e.target instanceof HTMLInputElement)return;const d:Record<string,number[]>={w:[0,.3],ArrowUp:[0,.3],s:[0,-.3],ArrowDown:[0,-.3],a:[-.3,0],ArrowLeft:[-.3,0],d:[.3,0],ArrowRight:[.3,0]};if(d[e.key]){e.preventDefault();move(d[e.key][0],d[e.key][1]);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[mode]);
 useEffect(()=>{const c=canvas.current,ctx=c?.getContext('2d');if(!c||!ctx)return;const w=c.width,h=c.height;ctx.fillStyle='#e8f2fc';ctx.fillRect(0,0,w,h);
 const project=(x:number,y:number,z:number)=>{const k=260/(z-position.z+1.8);return [w/2+(x-position.x)*k,h*.48-(y-1.6)*k]};
 const poly=(pts:number[][],color:string)=>{ctx.fillStyle=color;ctx.beginPath();pts.forEach((p,i)=>{const [x,y]=project(p[0],p[1],p[2]);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y)});ctx.closePath();ctx.fill();};
 const near=position.z+.15;
 poly([[-2.5,0,near],[2.5,0,near],[2.5,0,8],[-2.5,0,8]],'#8498a9');
 poly([[-2.5,0,near],[-2.5,3,near],[-2.5,3,8],[-2.5,0,8]],'#f2f5f7');
 poly([[2.5,0,near],[2.5,3,near],[2.5,3,8],[2.5,0,8]],'#d0dce5');
 poly([[-2.5,3,near],[2.5,3,near],[2.5,3,8],[-2.5,3,8]],'#b7c8d4');
 poly([[-2.5,0,8],[2.5,0,8],[2.5,3,8],[-2.5,3,8]],'#e9eef2');
 if('questionId' in result)result.options.forEach((o,i)=>{const x=i===0?-1.25:1.25;poly([[x-.65,0,7.98],[x+.65,0,7.98],[x+.65,2.2,7.98],[x-.65,2.2,7.98]],'#1648d8');const [sx,sy]=project(x,1.65,7.96);ctx.fillStyle='white';ctx.font='bold 18px sans-serif';ctx.textAlign='center';ctx.fillText(o.toUpperCase(),sx,sy);});
 else {ctx.fillStyle='#062b59';ctx.font='bold 30px sans-serif';ctx.textAlign='center';ctx.fillText(result.verdict,w/2,h/2);}
 },[position,result,mode]);
 return <section><p>Mission fictive, sans décision clinique.</p><div>{(['professional','hybrid','immersive'] as Mode[]).map((m,i)=><button key={m} aria-pressed={mode===m} onClick={()=>setMode(m)}>{['Professionnel','Hybride','Immersif'][i]}</button>)}</div>{mode!=='professional'&&'questionId' in result&&<GameView options={result.options} onAnswer={choose}/>}{'verdict' in result?<p role="status">{result.verdict}</p>:<><h2>{result.prompt}</h2>{result.options.map(option=><button key={option} onClick={()=>choose(option)}>{mode==='professional'?option:'Porte '+option}</button>)}</>}<button disabled={!history.length} onClick={()=>{setHistory(h=>h.slice(0,-1));setPosition({x:0,z:0})}}>Retour arrière</button><button onClick={()=>{setHistory([]);setPosition({x:0,z:0})}}>Recommencer</button></section>;
}
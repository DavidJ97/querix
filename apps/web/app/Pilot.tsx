'use client';
import {useState} from 'react';
import {evaluate} from '../../../packages/decision-engine/engine.mjs';
import graph from '../../../training/pilot-fictional.json';
export default function Pilot(){
 const [answers,setAnswers]=useState<Record<string,string>>({});
 const result=evaluate(graph,answers);
 return <section><p>Mission fictive, sans décision clinique.</p>{'verdict' in result?<p role="status">{result.verdict}</p>:<><h2>{result.prompt}</h2>{result.options.map(option=><button key={option} onClick={()=>setAnswers(old=>({...old,[result.questionId]:option}))}>{option}</button>)}</>}<button onClick={()=>setAnswers({})}>Recommencer</button></section>;
}
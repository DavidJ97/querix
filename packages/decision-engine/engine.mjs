export function evaluate(graph, answers = {}, now = Date.now()) {
 const hold = reason => ({verdict:'HOLD',reason});
 if(graph.status !== 'approved' || !Number.isFinite(Date.parse(graph.expiresAt)) || Date.parse(graph.expiresAt)<=now) return hold('invalid-version');
 let id=graph.start; const seen=new Set();
 while(true){
 if(seen.has(id)) return hold('cycle'); seen.add(id);
 const node=Object.hasOwn(graph.nodes,id)?graph.nodes[id]:null;
 if(!node) return hold('missing-node');
 if(node.type==='terminal') return ['GO','HOLD','STOP','DONE'].includes(node.verdict)?{verdict:node.verdict,nodeId:id}:hold('invalid-verdict');
 if(node.type!=='question'||!node.options) return hold('invalid-node');
 if(!Object.hasOwn(answers,id)) return {questionId:id,prompt:node.prompt,options:Object.keys(node.options)};
 const choice=answers[id];
 if(typeof choice!=='string'||!Object.hasOwn(node.options,choice)) return hold('invalid-answer');
 id=node.options[choice];
 }
}

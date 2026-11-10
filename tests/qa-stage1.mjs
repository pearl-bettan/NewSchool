import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const src=path.join(root,'src');
const tests=[];
function test(id,description,expected,run){
 try{const actual=run();tests.push({id,description,expected,actual,status:'passed'});}
 catch(error){tests.push({id,description,expected,actual:error.message,status:'failed'});}
}
const data=fs.readFileSync(path.join(src,'js/quiz-data.js'),'utf8');
const quiz=fs.readFileSync(path.join(src,'js/quiz.js'),'utf8');
const context=vm.createContext({});
vm.runInContext(data.replace('export const','const')+'\n'+quiz.replace(/^import .*;$/gm,'').replace(/export /g,'')+'\nglobalThis.qa={QUESTIONS,evaluateQuestion,calculateScore,renderQuestion};',context);
const {QUESTIONS,evaluateQuestion,calculateScore,renderQuestion}=context.qa;
let index=0;
function evaluate(q,answer,status,points,field){test(`L${++index}`,`Q${q+1}: ${JSON.stringify(answer)}`,{status,points,field},()=>{const r=evaluateQuestion(QUESTIONS[q],answer);assert.equal(r.status,status);if(points!==undefined)assert.ok(Math.abs(r.points-points)<1e-9);if(field)assert.equal(r.field,field);assert.ok(r.message.length>10);return JSON.parse(JSON.stringify(r));});}
for(let q=0;q<5;q++)for(const a of ['',null,undefined])evaluate(q,a,'missing',0);
for(const q of [0,3])for(const answer of ['a','b','c'])evaluate(q,answer,answer==='b'?'correct':'wrong',answer==='b'?1:0);
const multiPoints=[null,.5,.5,1,0,0,0,.5,0,0,0,.5,0,0,0,0];
for(let mask=0;mask<16;mask++){const answer=['a','b','c','d'].filter((_,i)=>mask&(1<<i));const points=multiPoints[mask];evaluate(1,answer,points===null?'missing':points===1?'correct':points>0?'partial':'wrong',points??0);}
for(const [answer,status,points] of [
 [['review','learn','practice'],'correct',1], [['review','practice','learn'],'partial',1/3],
 [['learn','review','practice'],'partial',1/3], [['practice','learn','review'],'partial',1/3],
 [['learn','practice','review'],'wrong',0], [['practice','review','learn'],'wrong',0],
 [['review','review','practice'],'invalid',0], [['review','','practice'],'missing',0]
])evaluate(2,answer,status,points);
const goal={action:'practice',quantity:'5',deadline:'19:00'};
for(const field of ['action','quantity','deadline'])evaluate(4,{...goal,[field]:''},'missing',0,field);
for(const quantity of ['0','-1','1.5','abc','Infinity'])evaluate(4,{...goal,quantity},'invalid',0,'quantity');
for(const quantity of ['1','3','5','11'])evaluate(4,{...goal,quantity},'correct',1);
for(const deadline of ['24:00','19:60','bad','7:00'])evaluate(4,{...goal,deadline},'invalid',0,'deadline');
for(const deadline of ['00:00','07:00','23:59'])evaluate(4,{...goal,deadline},'correct',1);
evaluate(4,{...goal,action:'read'},'correct',1);
evaluate(4,{...goal,action:'vague'},'partial',2/3);
for(const [points,percent,passed] of [[0,0,false],[2,40,false],[3,60,true],[5,100,true]])test(`S${points}`,`Score ${points}/5`,{percent,passed},()=>{const r=calculateScore([{points,maxPoints:5}]);assert.equal(r.percent,percent);assert.equal(r.passed,passed);return r;});
test('S-empty','Empty results',{percent:0,passed:false},()=>{const r=calculateScore([]);assert.equal(r.percent,0);assert.equal(r.passed,false);return r;});
for(const file of fs.readdirSync(path.join(src,'js'))){test('JS-'+file,'JavaScript syntax '+file,'valid syntax',()=>{new vm.Script(fs.readFileSync(path.join(src,'js',file),'utf8').replace(/^import .*;$/gm,'').replace(/export /g,''));return 'valid syntax';});}
const markup=QUESTIONS.map(renderQuestion).join('');
test('A-labels','Generated labels and feedback regions','unique IDs, linked labels, 5 live regions',()=>{const ids=[...markup.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);for(const m of markup.matchAll(/\bfor="([^"]+)"/g))assert.ok(ids.includes(m[1]));for(const m of markup.matchAll(/aria-describedby="([^"]+)"/g))for(const id of m[1].split(' '))assert.ok(ids.includes(id));assert.equal([...markup.matchAll(/aria-live="polite"/g)].length,5);return {ids:ids.length,liveRegions:5};});
function mainHarness(){
 const listeners={};const frame={contentWindow:{},style:{},scrollIntoView(){}};
 const bar={style:{}};const progress={value:20,setAttribute(_,value){this.value=value;},querySelector(){return bar;}};
 const document={querySelectorAll(selector){if(selector==='.activity-frame')return [frame];return [];},querySelector(selector){if(selector==='[role="progressbar"]')return progress;return {};}};
 const window={location:{origin:'https://example.test'},addEventListener(type,callback){listeners[type]=callback;}};
 vm.runInNewContext(fs.readFileSync(path.join(src,'js/main.js'),'utf8'),{document,window,IntersectionObserver:class{observe(){}}});
 return {frame,progress,message(data,origin='https://example.test',source=frame.contentWindow){listeners.message({origin,source,data});}};
}
for(const [id,origin,source] of [['origin','https://other.test',true],['window','https://example.test',false]])test('M-'+id,'Reject untrusted iframe '+id,'height unchanged',()=>{const h=mainHarness();h.message({source:'school-new-activity',type:'resize',height:700},origin,source?h.frame.contentWindow:{});assert.equal(h.frame.style.height,undefined);return 'ignored';});
for(const height of [-1,0,50000,'700',null,NaN])test('M-height-'+String(height),'Reject invalid resize height '+String(height),'height unchanged',()=>{const h=mainHarness();h.message({source:'school-new-activity',type:'resize',height});assert.equal(h.frame.style.height,undefined);return 'ignored';});
test('M-valid','Accept trusted resize','700px',()=>{const h=mainHarness();h.message({source:'school-new-activity',type:'resize',height:700});assert.equal(h.frame.style.height,'700px');return h.frame.style.height;});
test('M-invalid-result','Reject malformed quiz-result message','progress stays 20',()=>{const h=mainHarness();h.message({source:'school-new-activity',type:'quiz-result',percent:-10,points:-1,maxPoints:5,passed:true});assert.equal(h.progress.value,20);return h.progress.value;});
const hashes=Object.fromEntries(['index.html','css/styles.css','js/quiz.js','js/quiz-data.js','js/main.js','js/activity-bridge.js'].map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(src,file))).digest('hex')]));
const report={executedAt:new Date().toISOString(),scope:'Automated JavaScript checks and mocked DOM/message tests; not browser tests',hashes,summary:{total:tests.length,passed:tests.filter(t=>t.status==='passed').length,failed:tests.filter(t=>t.status==='failed').length},tests};
fs.writeFileSync(path.join(root,'doc/documentation/qa-automated-results.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({summary:report.summary,failures:tests.filter(t=>t.status==='failed')},null,2));
process.exitCode=report.summary.failed ? 1 : 0;

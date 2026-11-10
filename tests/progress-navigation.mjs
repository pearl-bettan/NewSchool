import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ids=['step-goal','step-split','step-review','step-plan','step-quiz'];
function setup(reducedMotion=false) {
  const handlers={};let observerCallback;
  const sections=ids.map(id=>({id,focus(options){this.focused=options;},scrollIntoView(options){this.scrolled=options;}}));
  const links=ids.map(id=>({attrs:{href:'#'+id},handlers:{},getAttribute(name){return this.attrs[name];},setAttribute(name,value){this.attrs[name]=value;},removeAttribute(name){delete this.attrs[name];},addEventListener(type,callback){this.handlers[type]=callback;}}));
  const bar={style:{setProperty(name,value){this[name]=value;}}};
  const progress={attrs:{},setAttribute(name,value){this.attrs[name]=value;},querySelector(){return bar;}};
  const label={textContent:''};
  const frame={contentWindow:{},style:{}};
  const document={
    querySelectorAll(selector){return selector==='.activity-frame'?[frame]:selector==='main > section'?sections:selector==='.progress-step'?links:[];},
    querySelector(selector){return selector==='[role="progressbar"]'?progress:selector==='#progress-label'?label:null;},
    getElementById(id){return sections.find(section=>section.id===id);}
  };
  vm.runInNewContext(fs.readFileSync(path.join(root,'src/js/main.js'),'utf8'),{
    document,window:{location:{origin:'https://example.test'},addEventListener(type,callback){handlers[type]=callback;}},
    matchMedia(){return {matches:reducedMotion};},IntersectionObserver:class{constructor(callback){observerCallback=callback;}observe(){}}
  });
  return {sections,links,bar,progress,label,frame,handlers,observe:entries=>observerCallback(entries)};
}
let checks=0;
for(const reduced of [false,true]) {
  const h=setup(reduced);
  for(const index of [0,1,2,3,4,2,0]) {
    let prevented=false;h.links[index].handlers.click({preventDefault(){prevented=true;}});
    assert.ok(prevented);
    assert.equal(h.progress.attrs['aria-valuenow'],(index+1)*20);
    assert.equal(h.bar.style['--progress-percent'],`${(index+1)*20}%`);
    assert.equal(h.label.textContent,`שלב ${index+1} מתוך 5`);
    assert.equal(h.links.filter(link=>link.attrs['aria-current']==='step').length,1);
    assert.equal(h.links[index].attrs['aria-current'],'step');
    assert.ok(h.sections[index].focused.preventScroll);
    assert.equal(h.sections[index].scrolled.behavior,reduced?'instant':'smooth');
    checks++;
  }
}
const h=setup();
h.observe([{target:h.sections[1],isIntersecting:true}]);assert.equal(h.links[1].attrs['aria-current'],'step');checks++;
h.observe([{target:h.sections[1],isIntersecting:false},{target:h.sections[3],isIntersecting:true}]);assert.equal(h.links[3].attrs['aria-current'],'step');checks++;
h.handlers.message({origin:'https://example.test',source:h.frame.contentWindow,data:{source:'school-new-activity',type:'revisit',id:'step-goal'}});
assert.equal(h.links[0].attrs['aria-current'],'step');assert.ok(h.sections[0].focused);checks++;
h.handlers.message({origin:'https://other.test',source:h.frame.contentWindow,data:{source:'school-new-activity',type:'revisit',id:'step-review'}});
assert.equal(h.links[0].attrs['aria-current'],'step');checks++;
// A clicked stage must win when adjacent sections are visible together.
for (const reduced of [false, true]) {
  const clicked = setup(reduced);
  clicked.observe([
    { target: clicked.sections[1], isIntersecting: true },
    { target: clicked.sections[2], isIntersecting: true }
  ]);
  clicked.links[1].handlers.click({ preventDefault() {} });
  clicked.observe([]);
  assert.equal(clicked.links[1].attrs['aria-current'], 'step');
  assert.equal(clicked.links[2].attrs['aria-current'], undefined);
  checks++;
  clicked.observe([{ target: clicked.sections[1], isIntersecting: false }]);
  assert.equal(clicked.links[2].attrs['aria-current'], 'step');
  checks++;
}
const smooth = setup();
smooth.observe([{ target: smooth.sections[4], isIntersecting: true }]);
smooth.links[1].handlers.click({ preventDefault() {} });
smooth.observe([{ target: smooth.sections[3], isIntersecting: true }]);
assert.equal(smooth.links[1].attrs['aria-current'], 'step');
checks++;
smooth.observe([
  { target: smooth.sections[4], isIntersecting: false },
  { target: smooth.sections[3], isIntersecting: false },
  { target: smooth.sections[1], isIntersecting: true },
  { target: smooth.sections[2], isIntersecting: true }
]);
assert.equal(smooth.links[1].attrs['aria-current'], 'step');
checks++;
console.log(`PASS: ${checks} mocked navigation/observer cases, including backward navigation, focus, current stage and reduced motion. Not browser tests.`);

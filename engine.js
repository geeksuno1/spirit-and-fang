/* Fixed 60 Hz fighter simulation. Rendering and input are deliberately separate. */
(function(root){
'use strict';
const STEP=1/60,WIDTH=1280,FLOOR=592,KNOCK_DECAY=14;
const base=(name,start,active,recovery,damage,range,more={})=>({name,start,active,recovery,damage,range,level:'mid',stun:.29,push:35,...more});
const SAYAK={
 light:base('Pommel Check',.10,.07,.17,5,92,{frames:['x0','x1','x0'],cancel:['heavy','sweep','shield','wisp','ancestor']}),
 heavy:base('Traveler’s Cut',.21,.13,.38,11,178,{frames:[4,5,6],cancel:['shield','wisp','ancestor']}),
 sweep:base('Iron Sweep',.17,.12,.39,9,128,{level:'low',knock:.65,frames:['x2','x3','x2']}),
 overhead:base('Crown Splitter',.31,.12,.32,13,133,{level:'overhead',frames:[4,7,6]}),
 shield:base('Shield March',.18,.12,.36,12,117,{travel:220,push:110,frames:['x4',8,'x5']}),
 rise:base('Rising Steel',.16,.18,.46,13,135,{airHit:true,launch:330,frames:[4,9,6]}),
 wisp:base('Wisp Shot',.30,.05,.42,11,0,{charge:1,spawn:'wisp',frames:['x7',12,12]}),
 grasp:base('Grave Grasp',.30,.05,.42,10,0,{charge:1,spawn:'grasp',frames:['x7',13,'x7']}),
 ancestor:base('Ancestor’s Rebuke',.34,.05,.43,14,0,{charge:1,spawn:'ancestor',frames:['x7',13,13]}),
 recall:base('Recall',.96,.01,.18,0,0,{frames:['x7','x7',0]}),
 throw:base('Last Orders',.14,.08,.43,13,90,{level:'throw',knock:.7,push:155,frames:['x4','x5','x6']}),
 dash:base('Dash',.02,.16,.08,0,0,{travel:650,dash:true,frames:[3,2,0]}),
 backdash:base('Backdash',.18,.01,.10,0,0,{backstep:600,dash:true,frames:[2,3,0]}),
 super:base('The Uncorking',.28,.11,.72,8,155,{meter:300,cinematic:true,frames:[13,13,6]})
};
const HUMAN={
 light:base('Friendly Warning',.08,.07,.16,5,91,{frames:[4,'ts0','ts1'],cancel:['heavy','sweep','wolf']}),
 heavy:base('Elbow Follow-through',.18,.10,.25,9,112,{frames:[4,6,0],cancel:['wolf']}),
 sweep:base('Ankle Tax',.16,.09,.25,7,120,{level:'low',frames:[9,'ts2','ts3']}),
 overhead:base('Traveler’s Trick',.28,.12,.30,11,125,{level:'overhead',frames:[4,7,0]}),
 step:base('False Step',.18,.10,.29,8,130,{backstep:140,evade:true,lunge:600,frames:[8,5,8]}),
 feint:base('Laughing Feint',.12,.0,.32,0,0,{frames:[9,9,0]}),
 wolf:base('White Fang',.26,.05,.35,11,0,{spawn:'wolf',cool:2.6,frames:[12,12,0]}),
 transform:base('Hyena Avatar',.35,.01,.24,0,0,{meter:100,frames:[13,13,13]}),
 throw:base('Wrong Turn',.13,.08,.40,12,84,{level:'throw',knock:.65,switch:true,frames:[4,6,10]}),
 dash:base('Dash',.02,.16,.08,0,0,{travel:760,dash:true,frames:[3,2,0]}),
 backdash:base('Backdash',.18,.01,.10,0,0,{backstep:620,dash:true,frames:[2,3,0]}),
 super:base('Midnight Hunt',.28,.12,.72,7,145,{meter:300,cinematic:true,travel:340,frames:[13,13,13]})
};
const BEAST={
 light:base('Raking Claws',.09,.08,.16,6,112,{frames:[4,'hs0',0],cancel:['heavy','sweep','rush','pounce']}),
 heavy:base('Savage Rake',.20,.12,.29,11,157,{frames:[4,'hs1',6],cancel:['rush']}),
 sweep:base('Hock Cutter',.18,.10,.33,9,143,{level:'low',knock:.6,frames:[9,'hs3',0]}),
 overhead:base('Falling Talons',.29,.13,.34,13,135,{level:'overhead',frames:[4,7,6]}),
 rush:base('Ravager Rush',.19,.13,.40,14,145,{travel:330,knock:.5,frames:[4,8,6]}),
 pounce:base('Carrion Pounce',.25,.22,.38,13,150,{level:'overhead',pounce:true,frames:[14,12,14]}),
 reversal:base('Cackling Reversal',.27,.10,.32,12,148,{backstep:140,evade:true,frames:[9,'hs2',6]}),
 throw:base('Jawbreaker',.16,.10,.51,17,88,{level:'throw',knock:.8,push:100,frames:[4,7,8]}),
 dash:base('Dash',.02,.16,.08,0,0,{travel:880,dash:true,frames:[3,2,0]}),
 backdash:base('Backdash',.18,.01,.10,0,0,{backstep:650,dash:true,frames:[2,3,0]}),
 super:base('Midnight Hunt',.28,.12,.72,7,150,{meter:300,cinematic:true,travel:340,frames:[4,13,6]})
};
function table(f){return f.kind==='sayak'?SAYAK:f.form>0?BEAST:HUMAN;}
function makeFighter(kind,x,dir){return {kind,x,dir,y:0,vy:0,hp:100,meter:100,charges:3,form:0,wins:0,action:null,stun:0,down:0,guard:false,crouch:false,walk:0,moving:0,cool:0,flash:0,combo:0,comboTime:0,lastMove:'',labelTime:0,aiWait:0,throwSafe:0,buffer:null,vx:0,aiSeen:null,aiReact:0,aiPlan:null,aiHold:0,aiHoldDown:false,aiMove:null,lastAxis:0,tapDir:0,tapTime:-9,hitstun:false,juggle:false};}
class Game{
 constructor(){this.events=[];this.mode='ai';this.difficulty=1;this.infinite=true;this.dummy='idle';this.state='menu';this.time=0;this.reset('sayak','ai');this.state='menu';}
 reset(selected='sayak',mode='ai'){this.selected=selected;this.mode=mode;this.round=1;this.fighters=[makeFighter(selected,390,1),makeFighter(selected==='sayak'?'tabaaqui':'sayak',890,-1)];this.state='fight';this.nextRound(true);}
 nextRound(first=false){if(!first)this.fighters=this.fighters.map((f,i)=>Object.assign(makeFighter(f.kind,i?890:390,i?-1:1),{wins:f.wins}));this.clock=90;this.projectiles=[];this.zones=[];this.cinematic=null;this.hitstop=0;this.intro=this.mode==='training'?.35:1.1;this.roundEnd=0;this.winner='';this.events=[];}
 emit(type,data={}){this.events.push({type,...data});}
 drain(){return this.events.splice(0);}
 trainingReset(){const selected=this.selected;this.reset(selected,'training');this.intro=0;}
 request(i,key){const f=this.fighters[i];if(this.state==='fight'&&this.intro>0&&this.intro<.3&&f&&table(f)[key]){f.buffer={key,time:.14};return false;}if(this.state!=='fight'||this.intro>0||this.roundEnd||this.cinematic||!f||f.hp<=0)return false;const moves=table(f),m=moves[key];if(!m)return false;
 if(f.action){const a=f.action;if(a.m.dash&&!m.dash&&a.t>=.10){f.action=null;}else if(a.key==='feint'&&a.t>.10&&['sweep','overhead'].includes(key)){f.action=null;}else if(a.hit&&a.t>=a.m.start&&a.m.cancel?.includes(key)){f.action=null;}else{f.buffer={key,time:.14};return false;}}
 if(f.stun>0||f.down>0)return false;if(f.y<0&&!['light','heavy','overhead'].includes(key))return false;
 if(m.charge&&(f.charges<m.charge||this.projectiles.some(p=>p.owner===i&&p.type!=='wolf')||this.zones.some(p=>p.owner===i))){this.emit('notice',{i,text:f.charges<m.charge?'BOTTLE EMPTY · U TO RECALL':'SPIRIT STILL ACTIVE'});return false;}
 if(m.meter&&f.meter<m.meter){this.emit('notice',{i,text:`NEEDS ${m.meter/100} STOCK${m.meter>100?'S':''}`});return false;}if(m.cool&&f.cool>0)return false;if(key==='recall'&&f.charges===3){this.emit('notice',{i,text:'BOTTLE FULL'});return false;}
 f.charges-=m.charge||0;f.meter-=m.meter||0;if(m.cool)f.cool=m.cool;f.action={key,m,t:0,done:false,hit:false,dir:f.dir};f.guard=false;f.lastMove=m.name;f.labelTime=1.3;f.buffer=null;this.emit('move',{i,key});return true;}
 control(f,input,dt,i){const tap=(input.right?1:0)-(input.left?1:0);if(!input.ai&&tap&&!f.lastAxis){if(f.tapDir===tap&&this.time-f.tapTime<.25){f.tapDir=0;this.request(i,tap===f.dir?'dash':'backdash');}else{f.tapDir=tap;f.tapTime=this.time;}}f.lastAxis=tap;
 if(f.stun>0||f.down>0||f.action){f.guard=false;return;}const axis=(input.right?1:0)-(input.left?1:0);f.crouch=!!input.down&&f.y===0;f.guard=f.y===0&&(!!input.guard||(axis===-f.dir));f.moving=0;if(input.jump&&f.y===0){f.vy=-800;f.y=-1;f.guard=false;this.emit('jump',{x:f.x});}if(!f.crouch&&axis){let speed=f.kind==='sayak'?250:f.form?330:290;f.x+=axis*speed*dt*(f.guard?.72:1);f.moving=axis;f.walk+=dt;}}
 // Effective forward reach of a melee move, including any travel during startup/active.
 reach(m){return m.range?m.range+(m.travel||0)*(m.start+m.active)+(m.lunge||0)*m.active-(m.backstep||0)*m.start:0;}
 // True only if the move reaches with a margin, allowing for the opponent walking away during its startup.
 reaches(f,o,m,d){const away=o.moving&&Math.sign(o.moving)===Math.sign(o.x-f.x);return this.reach(m)>=d+8+(away?190*m.start:0);}
 ai(i,dt){const f=this.fighters[i],o=this.fighters[1-i],d=Math.abs(f.x-o.x),lvl=this.difficulty,fwd=f.dir===1?'right':'left',back=f.dir===1?'left':'right';f.aiWait-=dt;f.aiHold=Math.max(0,f.aiHold-dt);let input={};if(this.mode==='training'){input.guard=this.dummy==='guard';input.down=this.dummy==='low';input.guard ||= input.down;return input;}
 const moves=table(f),busy=f.action||f.stun>0||f.down>0,oa=o.action;
 // React once per opponent move after a human-like delay (Casual ~.35s, Standard ~.24s, Fierce ~.17s), then commit to that read.
 if(oa&&oa!==f.aiSeen){f.aiSeen=oa;f.aiReact=(.2+Math.random()*.08)/lvl;const m=oa.m,threat=m.spawn||m.travel||m.pounce||d<this.reach(m)+70,read=Math.min(.92,.45+.3*lvl);
  f.aiPlan={guard:!!threat&&m.level!=='throw'&&Math.random()<Math.min(.9,.35+.35*lvl),down:m.level==='low'?Math.random()<read:m.level==='overhead'?Math.random()>read:Math.random()<.15,punished:false};}
 if(!oa){f.aiSeen=null;f.aiPlan=null;}
 f.aiReact=Math.max(0,f.aiReact-dt);const ready=oa&&f.aiPlan&&f.aiReact<=0;
 // Projectiles: decide once per projectile whether to jump it or block it.
 for(const p of this.projectiles){if(p.owner===i||p['ai'+i])continue;if(Math.abs(p.x-f.x)<300){p['ai'+i]=Math.random()<.2+.25*lvl?'jump':Math.random()<.35+.35*lvl?'guard':'none';}}
 const shot=this.projectiles.find(p=>p.owner!==i&&p['ai'+i]&&Math.abs(p.x-f.x)<260&&Math.sign(p.vx)===Math.sign(f.x-p.x));
 if(shot&&!busy){if(shot['ai'+i]==='jump'&&Math.abs(shot.x-f.x)<170&&f.y===0)input.jump=true;else if(shot['ai'+i]==='guard'){input.guard=true;input.down=shot.type==='wolf';}}
 // Punish: opponent's move has finished its active frames (whiffed or blocked) and something fast reaches.
 if(ready&&!busy&&!f.aiPlan.punished&&oa.t>oa.m.start+oa.m.active){f.aiPlan.punished=true;if(Math.random()<Math.min(.85,.3+.4*lvl)){const opts=Object.keys(moves).filter(k=>['light','heavy','sweep','rush','shield'].includes(k)&&this.reaches(f,o,moves[k],d)).sort((x,y)=>moves[x].start-moves[y].start);if(opts.length&&this.request(i,opts[0]))return input;}}
 if(ready&&f.aiPlan.guard&&oa.t<oa.m.start+oa.m.active+.05){input.guard=true;input.down=f.aiPlan.down;return input;}
 if(f.aiHold>0&&!busy&&d<200){input.guard=true;input.down=f.aiHoldDown;return input;}
 // Think: pick one plan per tick based on distance instead of rerolling every frame.
 if(f.aiWait<=0&&!busy){f.aiWait=(.18+Math.random()*.32)/lvl;f.aiMove=null;let key;
  const list=f.kind==='sayak'?['light','heavy','sweep','shield','overhead']:!f.form?['light','heavy','sweep','overhead','step']:['light','heavy','rush','sweep','reversal'];
  const inRange=list.filter(k=>moves[k]&&this.reaches(f,o,moves[k],d)),best=Math.max(...list.map(k=>this.reach(moves[k])));
  if(f.meter>=300&&d<this.reach(moves.super)-10)key='super';
  else if(f.kind==='sayak'&&!f.charges&&d>260)key='recall';
  else if(f.kind==='sayak'&&o.y<-45&&d<170)key='rise';
  else if(f.kind==='sayak'&&d>230&&f.charges&&Math.random()<.55)key=Math.random()<.4?'grasp':'wisp';
  else if(f.kind!=='sayak'&&!f.form&&f.meter>=100&&d>220&&Math.random()<.5)key='transform';
  else if(f.kind!=='sayak'&&!f.form&&d>240&&!f.cool&&Math.random()<.5)key='wolf';
  else if(f.form&&d>200&&d<330&&Math.random()<.4)key='pounce';
  else if(d>270&&Math.random()<.3+.15*lvl)key='dash';
  else if(d<95&&o.action&&Math.random()<.15)key='backdash';
  else if(d<88&&o.guard&&Math.random()<.6)key='throw';
  else if(inRange.length&&Math.random()<.5+.15*lvl)key=inRange[Math.floor(Math.random()*inRange.length)];
  else if(inRange.length&&Math.random()<.5){f.aiHold=.3+Math.random()*.35;f.aiHoldDown=Math.random()<.35;}
  else if(!inRange.length||d>best-20)f.aiMove=fwd;else if(d<90&&Math.random()<.4)f.aiMove=back;
  if(key)this.request(i,key);}
 if(!busy&&f.aiMove&&!input.jump){if(f.aiMove===fwd&&d<this.reach(moves.light)-15)f.aiMove=null;else input[f.aiMove]=true;}
 return input;}
 contact(i,j,m,origin,opts={}){const f=this.fighters[i],o=this.fighters[j];if(o.hp<=0||o.down>0||o.throwSafe>0&&m.level==='throw')return false;const air=o.y<-25;
 if(m.level==='throw'&&air)return false;if(o.action?.m.evade&&o.action.t<o.action.m.start&&m.level==='mid'&&!opts.projectile){if(f.action)f.action.connected=true;this.emit('notice',{i:j,text:'EVADE'});return false;}
 const front=(origin-o.x)*o.dir>=-10;const blocked=m.level!=='throw'&&o.guard&&!air&&front&&(m.level==='mid'||m.level==='low'&&o.crouch||m.level==='overhead'&&!o.crouch);
 if(m.level==='throw'&&o.action?.key==='throw'&&o.action.t<.2&&f.form<=0&&o.form<=0){o.action=null;f.action=null;f.x-=f.dir*45;o.x+=f.dir*45;this.emit('notice',{i,text:'THROW BREAK'});return false;}
 const comboing=(o.stun>0&&o.hitstun)||o.juggle,hitNo=blocked?f.combo:comboing&&f.comboTime>0?f.combo+1:1,amount=blocked?Math.max(.5,m.damage*.08):m.damage*Math.max(.3,1-.1*(hitNo-1));const hurtDir=Math.sign(o.x-origin)||f.dir;o.hp=Math.max(0,o.hp-amount);o.stun=blocked?.16:m.stun||.3;o.hitstun=!blocked;o.flash=.13;o.action=null;o.buffer=null;if(!blocked){o.guard=false;o.crouch=false;f.combo=hitNo;f.comboTime=.95;if(m.knock){o.down=m.knock;o.vy=-180;}if(m.launch){o.vy=-m.launch;o.y=Math.min(o.y,-1);o.juggle=true;}if(m.switch){const ox=o.x;o.x=f.x-f.dir*60;f.x=ox;}}
 // Knockback slides (decaying velocity) instead of teleporting; at the wall the attacker is pushed back instead.
 const pushDir=m.switch&&!blocked?(Math.sign(o.x-f.x)||-f.dir):hurtDir,dist=blocked?22:m.push||30,room=pushDir>0?WIDTH-85-o.x:o.x-85;o.vx=pushDir*dist*KNOCK_DECAY;if(!opts.projectile&&dist>room)f.vx=-pushDir*(dist-Math.max(0,room))*KNOCK_DECAY;
 // Transformed Tabaaqui cannot replenish meter until he returns to human form.
 if(!f.form)f.meter=Math.min(300,f.meter+(blocked?3:m.damage*1.4));if(!o.form)o.meter=Math.min(300,o.meter+amount*1.25);if(f.action&&!opts.projectile){f.action.hit=!blocked;f.action.connected=true;}this.hitstop=blocked?.06:m.damage>=12?.15:m.damage>=8?.12:.09;
 // Spirits still in their startup vanish when their summoner is interrupted.
 this.zones=this.zones.filter(z=>z.owner!==j||z.age>=z.delay);this.emit('hit',{x:o.x,y:FLOOR+o.y-(o.crouch?65:135),blocked,kind:f.kind,damage:amount,level:m.level});return !blocked;}
 melee(i,m){const f=this.fighters[i],o=this.fighters[1-i],dx=(o.x-f.x)*f.action.dir;let vertical=Math.abs(o.y-f.y)<(m.airHit?220:135);if(m.level==='low')vertical=o.y>-40;if(dx>=-25&&dx<m.range&&vertical)return this.contact(i,1-i,m,f.x);return false;}
 activate(i,a){const f=this.fighters[i],o=this.fighters[1-i],m=a.m;
 if(a.key==='recall'){f.charges=Math.min(3,f.charges+1);this.emit('recall',{x:f.x});return;}
 if(a.key==='transform'){f.form=8;this.emit('transform',{x:f.x});return;}
 if(m.spawn==='wisp'){this.projectiles.push({type:'wisp',owner:i,x:f.x+a.dir*75,y:FLOOR+f.y-140,vx:a.dir*420,dir:a.dir,life:2.7,age:0,m});return;}
 if(m.spawn==='wolf'){this.projectiles.push({type:'wolf',owner:i,x:f.x+a.dir*45,y:FLOOR-35,vx:a.dir*610,dir:a.dir,life:1.5,age:0,m});return;}
 if(m.spawn==='grasp'){this.zones.push({type:'grasp',owner:i,x:Math.max(70,Math.min(WIDTH-70,f.x+a.dir*240)),age:0,delay:.40,life:.95,done:false,m:{...m,level:'low',stun:.5}});return;}
 if(m.spawn==='ancestor'){this.zones.push({type:'ancestor',owner:i,x:f.x+a.dir*115,age:0,delay:.15,life:.7,done:false,m:{...m,airHit:true,launch:400}});return;}
 this.strike(i,a);}
 strike(i,a){const f=this.fighters[i],o=this.fighters[1-i],m=a.m;
 if(m.cinematic){if(this.melee(i,m)){this.cinematic={owner:i,age:0,tick:0,name:m.name,wasHuman:f.kind==='tabaaqui'&&!f.form};o.stun=2;f.action=null;this.emit('super',{i,name:m.name});}return;}
 if(m.damage)this.melee(i,m);}
 update(dt,inputs=[{},{}]){this.time+=dt;if(this.state!=='fight')return;
 if(this.hitstop>0){this.hitstop=Math.max(0,this.hitstop-dt);return;}
 if(this.intro>0){this.intro=Math.max(0,this.intro-dt);return;}
 if(this.roundEnd>0){this.roundEnd-=dt;if(this.roundEnd<=0){if(this.fighters.some(f=>f.wins>=2)){this.state='end';this.emit('matchEnd',{winner:this.winner});}else{this.round++;this.nextRound();}}return;}
 if(this.cinematic){const c=this.cinematic,f=this.fighters[c.owner],o=this.fighters[1-c.owner];c.age+=dt;const tick=Math.min(4,Math.floor(c.age/.28));if(tick>c.tick){c.tick=tick;o.hp=Math.max(0,o.hp-(tick===4?10:5));this.emit('hit',{x:o.x,y:FLOOR-125,kind:f.kind,damage:5,blocked:false});f.combo++;}if(c.age>1.4){this.cinematic=null;o.stun=.3;o.down=.6;o.vy=-170;o.x+=f.dir*85;this.checkEnd();}return;}
 if(this.mode!=='training')this.clock=Math.max(0,this.clock-dt);
 for(let i=0;i<2;i++){const f=this.fighters[i],o=this.fighters[1-i];f.dir=o.x>=f.x?1:-1;f.stun=Math.max(0,f.stun-dt);f.down=Math.max(0,f.down-dt);f.throwSafe=Math.max(0,f.throwSafe-dt);f.cool=Math.max(0,f.cool-dt);f.flash=Math.max(0,f.flash-dt);f.labelTime=Math.max(0,f.labelTime-dt);f.comboTime=Math.max(0,f.comboTime-dt);if(!f.comboTime)f.combo=0;if(f.form>0){f.form=Math.max(0,f.form-dt);if(!f.form)this.emit('revert',{x:f.x});}
 if(this.mode==='training'&&this.infinite){f.meter=300;f.charges=3;}const fromAI=i===1&&this.mode!=='local',input=fromAI?{...this.ai(i,dt),ai:true}:inputs[i]||{};this.control(f,input,dt,i);
 if(f.action){const a=f.action,m=a.m; a.t+=dt;if(m.backstep&&a.t<m.start)f.x-=a.dir*m.backstep*dt;if(m.travel&&a.t<m.start+m.active)f.x+=a.dir*m.travel*dt;if(m.lunge&&a.t>=m.start&&a.t<m.start+m.active)f.x+=a.dir*m.lunge*dt;
 if(m.pounce&&a.t>=m.start*.5&&!a.leapt){a.leapt=true;f.vy=-470;f.y=-1;}if(m.pounce&&a.leapt)f.x+=a.dir*340*dt;
 if(a.t>=m.start&&!a.done){a.done=true;this.activate(i,a);}else if(a.done&&!a.connected&&m.damage&&!m.spawn&&a.t<m.start+m.active)this.strike(i,a);
 if(f.action===a&&a.t>=m.start+m.active+m.recovery)f.action=null;}
 if(f.y<0||f.vy){f.y+=f.vy*dt;f.vy+=2300*dt;if(f.y>=0){f.y=0;f.vy=0;f.throwSafe=.12;f.juggle=false;this.emit('land',{x:f.x});}}if(f.buffer){f.buffer.time-=dt;if(f.buffer.time<=0)f.buffer=null;else if(!f.action&&!f.stun&&!f.down){const key=f.buffer.key;f.buffer=null;this.request(i,key);}}
 if(f.vx){f.x+=f.vx*dt;f.vx*=Math.exp(-KNOCK_DECAY*dt);if(Math.abs(f.vx)<4)f.vx=0;}
 f.x=Math.max(85,Math.min(WIDTH-85,f.x));}
 let [a,b]=this.fighters;if(Math.abs(a.x-b.x)<78&&Math.abs(a.y-b.y)<145){const dir=a.x<=b.x?1:-1,mid=(a.x+b.x)/2;a.x=Math.max(85,Math.min(WIDTH-85,mid-dir*39));b.x=Math.max(85,Math.min(WIDTH-85,mid+dir*39));}
 for(const p of this.projectiles){p.age+=dt;p.life-=dt;p.x+=p.vx*dt;const o=this.fighters[1-p.owner];const target=FLOOR+o.y-(o.crouch?70:125);if(Math.abs(p.x-o.x)<48&&Math.abs(p.y-target)<(p.type==='wolf'?108:105)){this.contact(p.owner,1-p.owner,p.m,p.x,{projectile:true});p.life=0;}}
 this.projectiles=this.projectiles.filter(p=>p.life>0&&p.x>-150&&p.x<WIDTH+150);
 for(const z of this.zones){z.age+=dt;if(z.age>=z.delay&&!z.done){z.done=true;const o=this.fighters[1-z.owner];if(Math.abs(o.x-z.x)<(z.type==='grasp'?70:110)&&(z.type==='ancestor'?o.y>-270:o.y>-45))this.contact(z.owner,1-z.owner,z.m,z.x,{projectile:true});}}
 this.zones=this.zones.filter(z=>z.age<z.life);if(this.mode==='training'){for(const f of this.fighters)if(f.hp<100&&!f.stun&&!f.down&&!f.action&&f.comboTime<=0)f.hp=Math.min(100,f.hp+dt*22);}this.checkEnd();}
 checkEnd(){if(this.mode==='training'){for(const f of this.fighters)f.hp=Math.max(1,f.hp);return;}const [a,b]=this.fighters;if(a.hp<=0||b.hp<=0||this.clock<=0){if(Math.abs(a.hp-b.hp)<.01)this.winner='DRAW';else{const win=a.hp>b.hp?a:b;win.wins++;this.winner=win.kind.toUpperCase()+' WINS';}this.roundEnd=2.3;this.emit('roundEnd',{winner:this.winner});}}
 demo(key){if(this.mode!=='training')return false;const f=this.fighters[0],o=this.fighters[1];f.action=null;f.stun=0;f.down=0;f.y=0;f.vy=0;f.meter=300;f.charges=key==='recall'?2:3;f.cool=0;f.combo=0;f.comboTime=0;f.x=450;f.dir=1;o.x=['recall','transform','feint'].includes(key)?850:['grasp','wisp','wolf'].includes(key)?690:key==='throw'||key==='light'?530:575;o.dir=-1;o.hp=100;o.stun=0;o.down=0;o.y=0;o.vy=0;o.action=null;this.projectiles=[];this.zones=[];this.cinematic=null;this.hitstop=0;this.intro=0;return this.request(0,key);}
 snapshot(){return {state:this.state,mode:this.mode,round:this.round,clock:this.clock,fighters:this.fighters.map(f=>({kind:f.kind,hp:f.hp,meter:f.meter,charges:f.charges,form:f.form,x:f.x,y:f.y,guard:f.guard,crouch:f.crouch,wins:f.wins,action:f.action?.key||null})),projectiles:this.projectiles.length,zones:this.zones.length};}
}
const API={Game,SAYAK,HUMAN,BEAST,table,STEP,WIDTH,FLOOR};if(typeof module!=='undefined')module.exports=API;root.FightEngine=API;
})(typeof window!=='undefined'?window:globalThis);


/* Standard-layout controllers: pure decoding, edge-triggered attacks, stick dead zone. */
(function(root){
function variant(action,down=false,guard=false){if(!down)return action;return ({light:'sweep',heavy:'overhead',signature:guard?'ancestor':'tech3',tech1:'tech2'})[action]||action;}
function decode(pad,previous=[]){const buttons=Array.from(pad.buttons||[],b=>!!b?.pressed||b?.value>.55),pressed=i=>!!buttons[i],edge=i=>pressed(i)&&!previous[i];const x=pad.axes?.[0]||0,y=pad.axes?.[1]||0;const held={left:pressed(14)||x<-.28,right:pressed(15)||x>.28,jump:pressed(12)||y<-.55,down:pressed(13)||y>.4,guard:pressed(6)};const actions=[];for(const [index,action] of [[2,'light'],[0,'heavy'],[1,'signature'],[3,'throw'],[4,'tech1'],[5,'utility'],[7,'super']])if(edge(index))actions.push(variant(action,held.down,held.guard));return {buttons,held,actions,start:edge(9),menuLeft:edge(14),menuRight:edge(15)};}
const api={variant,decode};root.FightControls=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

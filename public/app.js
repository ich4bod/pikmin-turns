var game, token, commander; let isSoloAgainInFlight = false; const $=id=>document.getElementById(id); const fail=e=>$('error').textContent=e; function availability(p,a){if(!p)return{ready:false,text:'?'};const s=p.units.red+p.units.blue+p.units.yellow;if(a==='gather'){if(p.units.blue>=2)return{ready:true,text:'Ready'};return{ready:false,text:'Needs 2 Blue'}}if(a==='scout'){if(p.units.yellow>=1)return{ready:true,text:'Ready'};return{ready:false,text:'Needs 1 Yellow'}}if(a==='skirmish'){if(p.units.red>=3)return{ready:true,text:'Ready'};return{ready:false,text:'Needs 3 Red'}}if(a==='carry'){if(s>=4&&p.nectar>=3&&p.insight>=1)return{ready:true,text:'Ready'};return{ready:false,text:'Needs 4 total · 3 nectar · 1 route'}}if(a==='recruit'){if(p.nectar>=2)return{ready:true,text:'Ready'};return{ready:false,text:'Needs 2 nectar'}}return{ready:false,text:''}}
function nextMove(p,s){if(s!=='playing')return '';if(availability(p,'carry').ready)return 'A relic is ready: carry it for 4 haul.';if(availability(p,'scout').ready&&p.insight<1)return 'Scout to map a route for relic carrying.';if(availability(p,'recruit').ready&&p.squad<9)return 'Grow your squad: 2 nectar becomes 3 Pikmin.';if(availability(p,'gather').ready)return 'Gather nectar for a stronger next turn.';return 'Wait for the next dispatch.'}
async function request(url, options={}) { const r=await fetch(url,{headers:{'content-type':'application/json'},...options}); const b=await r.json(); if(!r.ok) throw Error(b.error); return b; }
function inviteUrl(code) { return location.origin + '/?join=' + code.toUpperCase(); }
function showInvite(code) { $('code-value').textContent = code; }
async function copyInvite() {
  const btn = $('copy-invite');
  const url = inviteUrl(game.code);
  try {
    await navigator.clipboard.writeText(url);
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = 'Copy invite'; }, 1600);
  } catch (e) {
    try {
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.readOnly = true;
      document.body.appendChild(ta);
      ta.select();
      const success = document.execCommand('copy');
      document.body.removeChild(ta);
      if (success) {
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Copy invite'; }, 1600);
        return;
      }
    } catch (err) {}
    btn.textContent = 'Copy failed — use the code';
    setTimeout(() => { btn.textContent = 'Copy invite'; }, 2400);
  }
}
async function soloAgain() {
  if (isSoloAgainInFlight) return;
  isSoloAgainInFlight = true;
  const btn = $('solo-again');
  btn.disabled = true;
  try {
    game = await request('/api/solo', { method: 'POST', body: JSON.stringify({ name: commander }) });
    token = game.token;
    sessionStorage.setItem('pikmin', JSON.stringify({ code: game.code, token, commander }));
    $('error').textContent = '';
    draw();
  } catch (e) {
    fail(e.message);
    btn.disabled = false;
  } finally {
    isSoloAgainInFlight = false;
  }
}
function rematch(){sessionStorage.clear();location.href='/'}
async function host(){try{commander=$('name').value.trim();game=await request('/api/lobbies',{method:'POST',body:JSON.stringify({name:commander})});token=game.token;sessionStorage.setItem('pikmin',JSON.stringify({code:game.code,token,commander}));history.replaceState(null, '', inviteUrl(game.code));show()}catch(e){fail(e.message)}}
async function join(){try{commander=$('name').value.trim();game=await request('/api/lobbies/'+$('code').value.toUpperCase(),{method:'POST',body:JSON.stringify({name:commander})});token=game.token;sessionStorage.setItem('pikmin',JSON.stringify({code:game.code,token,commander}));history.replaceState(null, '', '/');show()}catch(e){fail(e.message)}}
async function solo(){try{commander=$('name').value.trim();game=await request('/api/solo',{method:'POST',body:JSON.stringify({name:commander})});token=game.token;sessionStorage.setItem('pikmin',JSON.stringify({code:game.code,token,commander}));show()}catch(e){fail(e.message)}}
async function act(action){try{game=await request('/api/lobbies/'+game.code+'/action',{method:'POST',body:JSON.stringify({token,action})});$('error').textContent='';draw()}catch(e){fail(e.message)}}
function owner(id,value){$(id).textContent=value ? `${value} controls this` : 'Unclaimed';}
function draw(){
  if(!game||!game.players)return;
  const currentPlayer=game.players[game.turn];
  console.log('draw: turn:', game.turn, 'currentPlayer:', currentPlayer?.name, 'status:', game.status);
  showInvite(game.code);
  $('phase').textContent=game.phase;
  const phaseNotes={'Dawn — grow your squad':'Build a crew before the garden gets crowded.','Afternoon — divide the crew':'Choose between supplies, routes, and the bridge.','Dusk — haul the treasure home':'Turn your preparation into haul before sunset.'};
  const phaseNote=$('phase-note');
  phaseNote.textContent=game.status==='playing'?phaseNotes[game.phase]:'';
  phaseNote.style.display=game.status==='playing'?'block':'none';
  $('status').textContent=game.status==='lobby'?'Share the seed. A second commander starts the duel.':game.status==='finished'?game.winner:`Round ${game.round} / 8 · ${game.turnName}'s turn`;
  $('goal').textContent=`First to ${game.target} haul wins. Bigger squads unlock stronger jobs; at dusk, haul, routes, then squad size break ties.`;
  const clock=$('dusk-clock');
  if(game.status==='lobby'){
    clock.innerHTML='<span aria-label="Round 1"></span><span aria-label="Round 2"></span><span aria-label="Round 3"></span><span aria-label="Round 4"></span><span aria-label="Round 5"></span><span aria-label="Round 6"></span><span aria-label="Round 7"></span><span aria-label="Round 8"></span>';
  } else if(game.status==='finished'){
    clock.innerHTML='<span aria-label="Round 1" class="done"></span><span aria-label="Round 2" class="done"></span><span aria-label="Round 3" class="done"></span><span aria-label="Round 4" class="done"></span><span aria-label="Round 5" class="done"></span><span aria-label="Round 6" class="done"></span><span aria-label="Round 7" class="done"></span><span aria-label="Round 8" class="done"></span>';
  } else {
    let h='';for(let i=1;i<=8;i++){let c='';if(i<game.round){c='done'}else if(i===game.round){c='now'}h+=`<span aria-label="Round ${i}" class="${c}"></span>`}clock.innerHTML=h;
  }
  owner('meadow',game.map.meadow);owner('bridge',game.map.bridge);owner('relic',game.map.relic);$('players').innerHTML=game.players.map(p=>{if(!p)return '';return `<div class="player ${p.name===commander?'you':''}"><b>${p.name}${p.name===commander?' · active':''}</b><span class="player-role">${game.status==='playing'&&p.name===commander?'Giving orders now':'Watching the garden'}</span><br><span class="units">🔴${p.units.red} 🔵${p.units.blue} 🟡${p.units.yellow}</span><br><b>🌱 ${p.squad} Pikmin in squad</b> <span class="haul-meter">HAUL ${p.score}/${game.target}<div class="haul-bar-bg"><div class="haul-bar-fill" style="width:${Math.min(p.score,12)/12*100}%"></div></div></span> · 🌼 ${p.nectar} nectar · 🧭 ${p.insight} routes</div>`;}).join('');
  const isP=game.status==='playing';
  const isH=isP&&currentPlayer&&currentPlayer.name===commander;
  const haulLeadEl=$('haul-lead');
  if(isP&&currentPlayer){
    const human=game.players.find(p=>p.name===commander);
    const rival=game.players.find(p=>p&&p.name!==commander);
    if(human&&rival){
      if(human.score===rival.score){haulLeadEl.textContent=`Garden tied at ${human.score} haul.`}
      else if(human.score>rival.score){haulLeadEl.textContent=`You lead by ${human.score-rival.score} haul.`}
      else{haulLeadEl.textContent=`${rival.name} leads by ${rival.score-human.score} haul.`}
    }else{haulLeadEl.textContent=''}
  }else{
    haulLeadEl.textContent='';
  }
  haulLeadEl.style.display=isP?'block':'none';
  const duskEdgeEl=$('dusk-edge');
  if(isP&&game.round>=6){
    const ps=game.players.filter(p=>p);
    if(ps.length>=2){
      const p1=ps[0];const p2=ps[1];
      let t='';if(p1.score!==p2.score){t=`Dusk edge: ${p1.score>p2.score?p1.name:p2.name} has more haul.`}else if(p1.insight!==p2.insight){t=`Dusk edge: ${p1.insight>p2.insight?p1.name:p2.name} has more routes.`}else if(p1.squad!==p2.squad){t=`Dusk edge: ${p1.squad>p2.squad?p1.name:p2.name} has the larger squad.`}else{t='Dusk edge: completely even.'}
      duskEdgeEl.textContent=t;duskEdgeEl.style.display='block';
    }else{duskEdgeEl.textContent='';duskEdgeEl.style.display='none'}
  }else{duskEdgeEl.textContent='';duskEdgeEl.style.display='none'}
  const haulDistance=$('haul-distance');haulDistance.textContent=isH?`You need ${Math.max(0,game.target-currentPlayer.score)} more haul to fill the ship signal.`:'';haulDistance.style.display=isH?'block':'none';$('squad-key').style.display=game.status==='playing'?'block':'none';['gather','scout','skirmish','carry','recruit'].forEach(a=>{const s=$(`availability-${a}`);const b=s.closest('.order');if(game.status==='finished'){b.disabled=true;s.textContent='Finished';b.dataset.state='finished'}else if(!isP||!isH){b.disabled=true;s.textContent='Waiting';b.dataset.state='waiting'}else{const r=availability(currentPlayer,a);b.disabled=!r.ready;s.textContent=r.text;b.dataset.state=r.ready?'ready':'blocked'}});$('order').textContent=game.status==='playing'&&isH?'Choose your crew’s next move.':game.status==='finished'?'The garden is quiet. Start a fresh lobby for another duel.':'Waiting for your rival\'s landing craft.';const lastLog=game.log[game.log.length-1];$('last-move').textContent=(game.status==='playing'&&lastLog)?`Last move: ${lastLog}`:'';$('last-move').style.display=game.status==='playing'?'block':'none';$('actions').style.display=game.status==='playing'?'grid':'none';const dispatchCount=game.log.length;$('dispatch-count').textContent=dispatchCount===1?'1 dispatch this garden':`${dispatchCount} dispatches this garden`;$('log').innerHTML=game.log.map(x=>'<div class="logline">'+x+'</div>').join('');const moveText=(isP&&isH)?nextMove(currentPlayer,game.status):'';$('next-move').textContent=moveText;$('next-move').style.display=moveText?'block':'none';const planText=(game.rivalPlan)?`Sprout is planning: ${game.rivalPlan}.`:'';$('rival-plan').textContent=planText;$('rival-plan').style.display=planText?'block':'none';const isLobby=game.status==='lobby';const isDuel=game.mode==='duel';const isWaitingForRival=isLobby&&isDuel;$('copy-invite').style.display=isLobby?'inline-block':'none';$('invite-note').style.display=isLobby?'block':'none';$('waiting-rival').style.display=isWaitingForRival?'block':'none';$('waiting-rival').textContent=`Waiting for a second commander at seed ${game.code}.`;const recap=$('final-recap');if(game.status==='finished'){recap.style.display='block';recap.innerHTML='';game.players.forEach(p=>{if(p){const l=document.createElement('div');l.textContent=`${p.name}: ${p.score} haul · ${p.insight} routes · ${p.squad} Pikmin`;recap.appendChild(l);}});}else{recap.style.display='none';} $('rematch').style.display=game.status==='finished'?'block':'none';
  $('solo-again').style.display=(game.status==='finished'&&game.mode==='solo')?'inline-block':'none';
  console.log('draw end status:', game.status, 'rematch display:', $('rematch').style.display);}
function show(){$('lobby').style.display='none';$('game').style.display='block';draw();if(game&&game.mode!=='solo'){setInterval(async()=>{try{game=await request('/api/lobbies/'+game.code);draw()}catch{}},400)}}
try {
  const params = new URLSearchParams(location.search);
  const joinCode = params.get('join');
  if (joinCode) {
    if (/^[A-F0-9]{6}$/i.test(joinCode)) {
      const code = joinCode.toUpperCase();
      $('code').value = code;
      $('lobby-title').textContent = "You’ve been invited to Sunspill Garden.";
      $('name').focus();
    }
  } else {
    const s = sessionStorage.getItem('pikmin') ? JSON.parse(sessionStorage.getItem('pikmin')) : null;
    if (s) {
      token = s.token;
      commander = s.commander;
      request('/api/lobbies/' + s.code).then(x => { game = x; show(); });
    }
  }
} catch (e) {}
window.host=host;window.join=join;window.solo=solo;window.act=act;window.show=show;window.draw=draw;window.rematch=rematch;window.soloAgain=soloAgain;window.copyInvite=copyInvite;

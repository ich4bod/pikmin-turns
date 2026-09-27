let game, token, commander; const $=id=>document.getElementById(id); const fail=e=>$('error').textContent=e; function availability(p,a){const s=p.units.red+p.units.blue+p.units.yellow;if(a==='gather'){if(s>=2)return{ready:true,text:'Ready'};return{ready:false,text:'Needs 2 Pikmin'}}if(a==='scout'){if(s>=1)return{ready:true,text:'Ready'};return{ready:false,text:'Needs 1 Pikmin'}}if(a==='skirmish'){if(s>=3)return{ready:true,text:'Ready'};return{ready:false,text:'Needs 3 Pikmin'}}if(a==='carry'){if(s>=4&&p.nectar>=3&&p.insight>=1)return{ready:true,text:'Ready'};return{ready:false,text:'Needs 4 Pikmin · 3 nectar · 1 route'}}if(a==='recruit'){if(p.nectar>=2)return{ready:true,text:'Ready'};return{ready:false,text:'Needs 2 nectar'}}return{ready:false,text:''}}
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
function rematch(){sessionStorage.clear();location.href='/'}
async function host(){try{commander=$('name').value.trim();game=await request('/api/lobbies',{method:'POST',body:JSON.stringify({name:commander})});token=game.token;sessionStorage.setItem('pikmin',JSON.stringify({code:game.code,token,commander}));history.replaceState(null, '', inviteUrl(game.code));show()}catch(e){fail(e.message)}}
async function join(){try{commander=$('name').value.trim();game=await request('/api/lobbies/'+$('code').value.toUpperCase(),{method:'POST',body:JSON.stringify({name:commander})});token=game.token;sessionStorage.setItem('pikmin',JSON.stringify({code:game.code,token,commander}));history.replaceState(null, '', '/');show()}catch(e){fail(e.message)}}
async function solo(){try{commander=$('name').value.trim();game=await request('/api/solo',{method:'POST',body:JSON.stringify({name:commander})});token=game.token;sessionStorage.setItem('pikmin',JSON.stringify({code:game.code,token,commander}));show()}catch(e){fail(e.message)}}
async function act(action){try{game=await request('/api/lobbies/'+game.code+'/action',{method:'POST',body:JSON.stringify({token,action})});$('error').textContent='';draw()}catch(e){fail(e.message)}}
function owner(id,value){$(id).textContent=value ? `${value} controls this` : 'Unclaimed';}
function draw(){const mine=game.players.find(p=>p.name===game.turn);showInvite(game.code);$('phase').textContent=game.phase;$('status').textContent=game.status==='lobby'?'Share the seed. A second commander starts the duel.':game.status==='finished'?game.winner:`Round ${game.round} / 8 · ${game.turn}'s turn`;$('goal').textContent=`First to ${game.target} haul wins. Bigger squads unlock stronger jobs; at dusk, haul, routes, then squad size break ties.`;owner('meadow',game.map.meadow);owner('bridge',game.map.bridge);owner('relic',game.map.relic);$('players').innerHTML=game.players.map(p=>`<div class="player ${p.name===game.turn?'you':''}"><b>${p.name}${p.name===game.turn?' · active':''}</b><br><span class="units">🔴${p.units.red} 🔵${p.units.blue} 🟡${p.units.yellow}</span><br><b>🌱 ${p.squad} Pikmin in squad</b> <span class="haul-meter">HAUL ${p.score}/${game.target}<div class="haul-bar-bg"><div class="haul-bar-fill" style="width:${Math.min(p.score,12)/12*100}%"></div></div></span> · 🌼 ${p.nectar} nectar · 🧭 ${p.insight} routes</div>`).join('');const h=game.players.find(p=>p.name===commander);const isP=game.status==='playing';const isH=isP&&game.turn===commander;const isF=game.status==='finished';['gather','scout','skirmish','carry','recruit'].forEach(a=>{const s=$(`availability-${a}`);const b=s.closest('.order');if(isF){b.disabled=true;s.textContent='Finished';b.dataset.state='finished'}else if(!isP||!isH){b.disabled=true;s.textContent='Waiting';b.dataset.state='waiting'}else{const r=availability(h,a);b.disabled=!r.ready;s.textContent=r.text;b.dataset.state=r.ready?'ready':'blocked'}});$('order').textContent=game.status==='playing'&&isH?'Choose your crew’s next move.':game.status==='finished'?'The garden is quiet. Start a fresh lobby for another duel.':"Waiting for your rival's landing craft.";const lastLog=game.log[game.log.length-1];$('last-move').textContent=(game.status==='playing'&&lastLog)?`Last move: ${lastLog}`:'';$('last-move').style.display=game.status==='playing'?'block':'none';$('actions').style.display=game.status==='playing'?'grid':'none';$('rematch').style.display=game.status==='finished'?'inline-block':'none';$('log').innerHTML=game.log.map(x=>'<div class="logline">'+x+'</div>').join('');const isLobby=game.status==='lobby';$('copy-invite').style.display=isLobby?'inline-block':'none';$('invite-note').style.display=isLobby?'block':'none';}
function show(){$('lobby').style.display='none';$('game').style.display='block';draw();setInterval(async()=>{try{game=await request('/api/lobbies/'+game.code);draw()}catch{}},400)}
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

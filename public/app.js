let game, token, commander; const $=id=>document.getElementById(id); const fail=e=>$('error').textContent=e;
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
async function host(){try{commander=$('name').value.trim();game=await request('/api/lobbies',{method:'POST',body:JSON.stringify({name:commander})});token=game.token;sessionStorage.setItem('pikmin',JSON.stringify({code:game.code,token,commander}));history.replaceState(null, '', inviteUrl(game.code));show()}catch(e){fail(e.message)}}
async function join(){try{commander=$('name').value.trim();game=await request('/api/lobbies/'+$('code').value.toUpperCase(),{method:'POST',body:JSON.stringify({name:commander})});token=game.token;sessionStorage.setItem('pikmin',JSON.stringify({code:game.code,token,commander}));history.replaceState(null, '', '/');show()}catch(e){fail(e.message)}}
async function solo(){try{commander=$('name').value.trim();game=await request('/api/solo',{method:'POST',body:JSON.stringify({name:commander})});token=game.token;sessionStorage.setItem('pikmin',JSON.stringify({code:game.code,token,commander}));show()}catch(e){fail(e.message)}}
async function act(action){try{game=await request('/api/lobbies/'+game.code+'/action',{method:'POST',body:JSON.stringify({token,action})});draw()}catch(e){alert(e.message)}}
function owner(id,value){$(id).textContent=value ? `held by ${value}` : 'unclaimed';}
function draw(){const mine=game.players.find(p=>p.name===game.turn);showInvite(game.code);$('phase').textContent=game.phase;$('status').textContent=game.status==='lobby'?'Share the seed. A second commander starts the duel.':game.status==='finished'?game.winner:`Round ${game.round} / 8 · ${game.turn}'s turn`;$('goal').textContent=`First to ${game.target} haul wins. Bigger squads unlock stronger jobs; at dusk, haul, routes, then squad size break ties.`;owner('meadow',game.map.meadow);owner('bridge',game.map.bridge);$('relic').textContent=game.map.relic?`carried by ${game.map.relic}`:'waiting for a route';$('players').innerHTML=game.players.map(p=>`<div class="player ${p.name===game.turn?'you':''}"><b>${p.name}${p.name===game.turn?' · active':''}</b><br><span class="units">🔴${p.units.red} 🔵${p.units.blue} 🟡${p.units.yellow}</span><br><b>🌱 ${p.squad} Pikmin in squad</b> · ☀️ ${p.score}/${game.target} haul · 🌼 ${p.nectar} nectar · 🧭 ${p.insight} routes</div>`).join('');const active=game.status==='playing'&&game.turn===commander;document.querySelectorAll('.order').forEach(b=>b.disabled=!active);$('order').textContent=game.status==='playing'&&active?'Choose your crew’s next move.':game.status==='finished'?'The garden is quiet. Start a fresh lobby for another duel.':"Waiting for your rival's landing craft.";$('actions').style.display=game.status==='playing'?'grid':'none';$('log').innerHTML=game.log.map(x=>'<div class="logline">'+x+'</div>').join('');const isLobby=game.status==='lobby';$('copy-invite').style.display=isLobby?'inline-block':'none';$('invite-note').style.display=isLobby?'block':'none';}
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

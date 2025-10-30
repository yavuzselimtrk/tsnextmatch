// ---- Yıldız animasyonu
(function createStars(){
  const starsContainer = document.getElementById('starsBackground');
  for (let i=0;i<100;i++){
    const s=document.createElement('div'); s.className='star';
    s.style.left=Math.random()*100+'%';
    s.style.top=Math.random()*100+'%';
    s.style.animationDelay=Math.random()*3+'s';
    starsContainer.appendChild(s);
  }
})();

// ---- Fikstür (TSL) — saatler yoksa 19:00 varsayıyoruz
const RAW_FIXTURE = [
  { d:"2025-08-11", opp:"Kocaelispor", home:true },
  { d:"2025-08-18", opp:"Kasımpaşa", home:false },
  { d:"2025-08-24", opp:"Antalyaspor", home:true },
  { d:"2025-08-31", opp:"Samsunspor", home:true },
  { d:"2025-09-14", opp:"Fenerbahçe", home:false },
  { d:"2025-09-20", opp:"Gaziantep FK", home:true },
  { d:"2025-09-27", opp:"Fatih Karagümrük", home:false },
  { d:"2025-10-03", opp:"Kayserispor", home:true },
  { d:"2025-10-18", opp:"Çaykur Rizespor", home:false },
  { d:"2025-10-25", opp:"Eyüpspor", home:true },
  { d:"2025-11-01", opp:"Galatasaray", home:false },
  { d:"2025-11-08", opp:"Alanyaspor", home:true },
  { d:"2025-11-24", opp:"Başakşehir", home:false },
  { d:"2025-11-29", opp:"Konyaspor", home:true },
  { d:"2025-12-07", opp:"Göztepe", home:false },
  { d:"2025-12-14", opp:"Beşiktaş", home:true },
  { d:"2025-12-21", opp:"Gençlerbirliği", home:false },
  { d:"2026-01-18", opp:"Kocaelispor", home:false },
  { d:"2026-01-25", opp:"Kasımpaşa", home:true },
  { d:"2026-02-01", opp:"Antalyaspor", home:false },
  { d:"2026-02-08", opp:"Samsunspor", home:false },
  { d:"2026-02-15", opp:"Fenerbahçe", home:true },
  { d:"2026-02-22", opp:"Gaziantep FK", home:false },
  { d:"2026-03-01", opp:"Fatih Karagümrük", home:true },
  { d:"2026-03-08", opp:"Kayserispor", home:false },
  { d:"2026-03-15", opp:"Çaykur Rizespor", home:true },
  { d:"2026-03-22", opp:"Eyüpspor", home:false },
  { d:"2026-04-05", opp:"Galatasaray", home:true },
  { d:"2026-04-12", opp:"Alanyaspor", home:false },
  { d:"2026-04-19", opp:"Başakşehir", home:true },
  { d:"2026-04-26", opp:"Konyaspor", home:false },
  { d:"2026-05-03", opp:"Göztepe", home:true },
  { d:"2026-05-10", opp:"Beşiktaş", home:false },
  { d:"2026-05-17", opp:"Gençlerbirliği", home:true }
];

const MATCHES = RAW_FIXTURE.map(x => ({
  date: `${x.d}T19:00:00+03:00`,
  opponent: x.opp,
  home: x.home,
  competition: "TSL"
})).sort((a,b) => new Date(a.date) - new Date(b.date));

const COMP_NAMES  = { TSL: "Trendyol Süper Lig" };
const COMP_EMOJIS = { TSL: "🇹🇷" };

// ---- DOM helpers
const $  = sel => document.querySelector(sel);
const toDate = iso => new Date(iso);

// ---- Filtreler
function getFilteredMatches(){
  const homeVal = $('#homeFilter').value;  // all | home | away
  const compVal = $('#compFilter').value;  // all | TSL
  const q = $('#searchInput').value.trim().toLowerCase();

  return MATCHES.filter(m => {
    const byHome = homeVal === 'all' ? true : (homeVal === 'home' ? m.home : !m.home);
    const byComp = compVal === 'all' ? true : m.competition === compVal;
    const bySearch = q ? m.opponent.toLowerCase().includes(q) : true;
    return byHome && byComp && bySearch;
  });
}

function getNextMatch(list){
  const now = new Date();
  return (list || MATCHES).find(m => toDate(m.date) > now);
}

// ---- CANLI SKOR (Maçkolik) ---------------------------------------------------
// Uç nokta + CORS fallback sıralı denemeler
const LIVE_URL = "https://goapi.mackolik.com/livedata?group=0";

async function fetchJSON(url){
  const r = await fetch(url, { cache:"no-store" });
  if(!r.ok) throw new Error("HTTP "+r.status);
  return r.json();
}

async function fetchLiveTS(){
  // 1) Doğrudan
  try { return parseLive(await fetchJSON(LIVE_URL)); } catch(_){}
  // 2) allorigins
  try { return parseLive(await fetchJSON("https://api.allorigins.win/raw?url="+encodeURIComponent(LIVE_URL))); } catch(_){}
  // 3) isomorphic-cors
  try { return parseLive(await fetchJSON("https://cors.isomorphic-git.org/"+LIVE_URL)); } catch(e){
    console.warn("Live fetch failed:", e);
    return null;
  }
}

// Farklı alan adları için esnek ayrıştırma
function parseLive(data){
  const items = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
  const ts = items.filter(it=>{
    const h = (it.homeTeamName || it.homeName || it.HomeTeam || it.hTeam || "").toString();
    const a = (it.awayTeamName || it.awayName || it.AwayTeam || it.aTeam || "").toString();
    return /trabzonspor/i.test(h) || /trabzonspor/i.test(a);
  }).map(it=>{
    const home  = (it.homeTeamName || it.homeName || it.HomeTeam || it.hTeam || "").toString();
    const away  = (it.awayTeamName || it.awayName || it.AwayTeam || it.aTeam || "").toString();
    const hs    = Number(it.homeScore ?? it.HomeScore ?? it.hScore ?? it.hs ?? 0);
    const as    = Number(it.awayScore ?? it.AwayScore ?? it.aScore ?? it.as ?? 0);
    const minute= it.minute ?? it.Min ?? it.mn ?? null;
    const status= (it.status ?? it.Status ?? "").toString().toLowerCase(); // live/finished/notstarted
    return { home, away, hs, as, minute, status };
  });
  return ts[0] || null; // aynı anda tek TS maçı varsayıyoruz
}

// ---- Render ------------------------------------------------------------------
function renderCountdown(nextMatch){
  const el = $('#countdown');
  if(!nextMatch){ el.innerHTML = ''; return; }

  const now = new Date();
  const target = toDate(nextMatch.date);
  const diff = target - now;
  if(diff <= 0){ el.innerHTML = ''; return; }

  const days    = Math.floor(diff / (1000*60*60*24));
  const hours   = Math.floor((diff%(1000*60*60*24))/(1000*60*60));
  const minutes = Math.floor((diff%(1000*60*60))/(1000*60));
  const seconds = Math.floor((diff%(1000*60))/1000);

  el.innerHTML = `
    <div class="time-box"><div class="time-value">${days}</div><div class="time-label">GÜN</div></div>
    <div class="time-box"><div class="time-value">${hours}</div><div class="time-label">SAAT</div></div>
    <div class="time-box"><div class="time-value">${minutes}</div><div class="time-label">DAKİKA</div></div>
    <div class="time-box"><div class="time-value">${seconds}</div><div class="time-label">SANİYE</div></div>
  `;
}

function renderNextMatchCard(nextMatch, live){
  const el = $('#nextMatchCard');
  if(!nextMatch){
    el.innerHTML = `<h3>🏁 Sıradaki maç yok</h3>`;
    return;
  }
  const d = toDate(nextMatch.date);

  // canlı ise skoru bas
  if(live && (live.status.includes("live") || live.minute!=null)){
    el.classList.add('live-box');
    el.innerHTML = `
      <h3>🔴 Canlı Maç <span class="live-badge">LIVE</span></h3>
      <div class="match-details"><strong>${live.home} vs ${live.away}</strong></div>
      <div class="scoreline">${live.hs} - ${live.as}</div>
      <div class="match-details">${live.minute ? ("'" + live.minute) : "Devam ediyor"}</div>
      <div class="competition">${COMP_EMOJIS[nextMatch.competition]} ${COMP_NAMES[nextMatch.competition]}</div>
    `;
    return;
  } else {
    el.classList.remove('live-box');
  }

  // normal kart
  el.innerHTML = `
    <h3>Bir Sonraki Maç</h3>
    <div class="match-details">
      <strong>${nextMatch.home ? '🏠 TRABZONSPOR' : '✈️ ' + nextMatch.opponent}
        - ${nextMatch.home ? nextMatch.opponent : 'TRABZONSPOR 🐺'}</strong>
    </div>
    <div class="match-details">
      📅 ${d.toLocaleDateString('tr-TR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
    </div>
    <div class="match-details">
      🕐 ${d.toLocaleTimeString('tr-TR', { hour:'2-digit', minute:'2-digit' })}
    </div>
    <div class="competition">${COMP_EMOJIS[nextMatch.competition]} ${COMP_NAMES[nextMatch.competition]}</div>
  `;
}

function renderList(list){
  const el = $('#matchesList');
  const now = new Date();

  if(list.length === 0){
    el.innerHTML = `<div class="match-item"><div class="match-text">Eşleşme bulunamadı.</div></div>`;
    return;
  }

  el.innerHTML = list
    .filter(m => toDate(m.date) > now)   // geçmişleri gizliyoruz (istersen kaldır)
    .slice(0, 40)
    .map(m => {
      const d = toDate(m.date);
      const homeName = 'Trabzonspor';
      const awayName = m.opponent;
      const oppLine = m.home ? `${homeName} vs ${awayName}` : `${awayName} vs ${homeName}`;
      return `
        <div class="match-item">
          <div class="match-text">
            <div class="match-opponents">${oppLine}</div>
            <div class="match-meta">
              ${d.toLocaleDateString('tr-TR', { day:'2-digit', month:'2-digit', year:'numeric' })}
              • ${d.toLocaleTimeString('tr-TR', { hour:'2-digit', minute:'2-digit' })}
              • ${m.home ? 'Ev' : 'Deplasman'}
              • ${COMP_NAMES[m.competition]}
            </div>
          </div>
        </div>
      `;
    }).join('');
}

// ---- Çizim & döngüler --------------------------------------------------------
function draw(){
  const list = getFilteredMatches();
  const next = getNextMatch(list) || getNextMatch(MATCHES);
  renderCountdown(next);
  renderNextMatchCard(next, window.__LIVE_TS__);
  renderList(list);
}

// filtre olayları
document.getElementById('homeFilter').addEventListener('change', draw);
document.getElementById('compFilter').addEventListener('change', draw);
document.getElementById('searchInput').addEventListener('input', draw);

// geri sayım saniyede 1 yenilensin
setInterval(()=>{
  const list = getFilteredMatches();
  const next = getNextMatch(list) || getNextMatch(MATCHES);
  renderCountdown(next);
}, 1000);

// canlı skoru 15 sn’de bir güncelle
async function pollLive(){
  window.__LIVE_TS__ = await fetchLiveTS(); // null olabilir (canlı yoksa / CORS engeli varsa)
  draw();
}
(async ()=>{ await pollLive(); })();
setInterval(pollLive, 15000);

// ilk çizim
draw();

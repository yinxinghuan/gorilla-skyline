import './style.css';

const localeOverride = localStorage.getItem('game_locale');
const locale = localeOverride === 'zh' || localeOverride === 'en'
  ? localeOverride
  : navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
const copy = {
  zh: {
    wind: '风速',
    angle: '角度',
    power: '力度',
    computer: '电脑',
    victory: '命中天际',
    defeat: '城市失守',
    won: '你赢了',
    lost: '电脑赢了',
    score: '积分',
    round: '回合',
    again: '再来一局',
    rank: '排行榜',
    lb: '天际榜',
    leaders: '排行榜',
    open: '在 AlterU 中打开即可查看排行榜',
    download: '下载 AlterU',
    empty: '还没有人登上天际榜'
  },
  en: {
    wind: 'WIND',
    angle: 'ANGLE',
    power: 'POWER',
    computer: 'COMPUTER',
    victory: 'SKYLINE HIT',
    defeat: 'CITY LOST',
    won: 'YOU WON',
    lost: 'COMPUTER WON',
    score: 'SCORE',
    round: 'ROUND',
    again: 'PLAY AGAIN',
    rank: 'LEADERBOARD',
    lb: 'SKYLINE BOARD',
    leaders: 'LEADERS',
    open: 'Open in AlterU to view the leaderboard.',
    download: 'Get AlterU',
    empty: 'No skyline scores yet'
  }
}[locale];

document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
document.querySelector('[data-wind-label]').textContent = copy.wind;
document.querySelectorAll('[data-angle-label]').forEach((el) => { el.textContent = copy.angle; });
document.querySelectorAll('[data-power-label]').forEach((el) => { el.textContent = copy.power; });
document.querySelector('#info-right .name').textContent = copy.computer;
document.querySelector('[data-score-label]').textContent = copy.score;
document.querySelector('[data-round-label]').textContent = copy.round;
document.querySelector('[data-again]').textContent = copy.again;
document.querySelector('[data-rank]').textContent = copy.rank;
document.querySelector('[data-lb-title]').textContent = copy.lb;

const A = window.Aigram;
const ghost = document.querySelector('[data-ghost]');
const result = document.querySelector('#congratulations');
const finalScore = document.querySelector('#final-score');
const finalRound = document.querySelector('#final-round');
const winner = document.querySelector('#winner');
const resultKicker = document.querySelector('[data-result-kicker]');
const leaderboard = document.querySelector('#lbFull');
const list = document.querySelector('#lblist');
const champion = document.querySelector('#lb');
const flash = document.querySelector('.sg-flash');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let rows = [];
let preRunBest = 0;
let ghostTimer = 0;
let userInteracted = false;
let audioContext;
let ghostRunId = 0;

function tone(kind) {
  try {
    audioContext ??= new AudioContext();
    const now = audioContext.currentTime;
    const notes = kind === 'win' ? [220, 330, 495] : [kind === 'lose' ? 180 : kind === 'impact' ? 70 : kind === 'throw' ? 180 : 120];
    notes.forEach((frequency, index) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = kind === 'impact' ? 'sawtooth' : kind === 'lose' ? 'square' : kind === 'grab' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(frequency, now + index * .1);
      if (kind === 'throw') osc.frequency.exponentialRampToValueAtTime(420, now + .22);
      if (kind === 'lose') osc.frequency.exponentialRampToValueAtTime(70, now + .35);
      gain.gain.setValueAtTime(.0001, now + index * .1);
      gain.gain.exponentialRampToValueAtTime(.025, now + index * .1 + .015);
      gain.gain.exponentialRampToValueAtTime(.0001, now + index * .1 + (kind === 'win' ? .42 : .18));
      osc.connect(gain).connect(audioContext.destination);
      osc.start(now + index * .1);
      osc.stop(now + index * .1 + .46);
    });
  } catch {
    // Optional audio.
  }
}

function stopGhost() {
  userInteracted = true;
  ghostRunId += 1;
  clearTimeout(ghostTimer);
  ghost.classList.remove('sg-ghost--show');
  window.Gorillas?.resetDemoAim();
}

function runGhost() {
  if (userInteracted || reducedMotion || !window.Gorillas) return;
  const runId = ++ghostRunId;
  ghost.classList.add('sg-ghost--show');
  const start = performance.now();
  const tick = (now) => {
    if (runId !== ghostRunId) return;
    const t = Math.min(1, (now - start) / 2000);
    if (userInteracted || t >= 1) {
      ghost.classList.remove('sg-ghost--show');
      window.Gorillas?.resetDemoAim();
      return;
    }
    window.Gorillas.demoAim(t);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

if (new URLSearchParams(location.search).has('qa')) {
  window.__sgDebug = {
    state: () => ({ userInteracted, reducedMotion, hasGame: Boolean(window.Gorillas) }),
    runGhost
  };
}

function unwrapRows(response) {
  const data = Array.isArray(response) ? response : response?.data;
  return Array.isArray(data) ? data.map((row) => ({
    ...row,
    rank: Number(row.rank) || 0,
    score: Number(row.score) || 0
  })) : [];
}

function avatar(row) {
  const wrap = document.createElement('span');
  wrap.className = 'sg-avatar';
  if (row.head_url) {
    const img = document.createElement('img');
    img.src = row.head_url;
    img.alt = '';
    img.draggable = false;
    img.onerror = () => {
      wrap.textContent = (row.user_name || '?').trim().charAt(0).toUpperCase() || '?';
    };
    wrap.appendChild(img);
  } else {
    wrap.textContent = (row.user_name || '?').trim().charAt(0).toUpperCase() || '?';
  }
  return wrap;
}

function leaderboardRow(row) {
  const isMe = String(row.user_id) === String(A?.telegramId);
  const item = document.createElement(isMe ? 'div' : 'button');
  if (!isMe) item.type = 'button';
  item.className = `sg-rank-row${isMe ? ' sg-rank-row--me' : ''}`;
  const rank = document.createElement('b');
  rank.textContent = `#${row.rank || '—'}`;
  item.append(rank, avatar(row));
  const name = document.createElement('span');
  name.className = 'sg-rank-row__name';
  name.textContent = isMe ? (locale === 'zh' ? '你' : 'YOU') : (row.user_name || '?');
  const score = document.createElement('strong');
  score.textContent = String(row.score);
  item.append(name, score);
  if (!isMe) {
    item.addEventListener('click', () => {
      if (A?.isInAigram) A.openAigramProfile(row.user_id);
    });
  }
  return item;
}

function renderFullRows() {
  list.innerHTML = '';
  if (!A?.canRank) {
    const box = document.createElement('div');
    box.className = 'sg-download';
    const text = document.createElement('p');
    text.textContent = copy.open;
    const link = document.createElement('a');
    link.href = 'https://alteru.app';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = copy.download;
    box.append(text, link);
    list.appendChild(box);
    return;
  }
  if (!rows.length) {
    const empty = document.createElement('p');
    empty.className = 'sg-empty';
    empty.textContent = copy.empty;
    list.appendChild(empty);
    return;
  }
  rows.forEach((row) => list.appendChild(leaderboardRow(row)));
}

function renderChampion() {
  if (!A?.canRank) {
    champion.hidden = true;
    return;
  }
  champion.hidden = false;
  champion.innerHTML = '';
  const top = rows[0];
  if (!top) {
    champion.textContent = copy.leaders;
    return;
  }
  champion.appendChild(avatar(top));
  const name = document.createElement('span');
  name.textContent = String(top.user_id) === String(A.telegramId) ? (locale === 'zh' ? '你' : 'YOU') : (top.user_name || '?');
  const score = document.createElement('strong');
  score.textContent = String(top.score);
  champion.append(name, score);
}

async function refreshLeaderboard() {
  if (!A?.canRank) return [];
  try {
    rows = unwrapRows(await A.callAigramAPI(
      `/note/aigram/ai/game/rank/score/list/by/session_id?session_id=${encodeURIComponent(A.gameUuid)}`,
      'GET'
    )).sort((a, b) => a.rank - b.rank);
    renderChampion();
    if (leaderboard.classList.contains('sg-leaderboard--show')) renderFullRows();
    return rows;
  } catch {
    return rows;
  }
}

function snapshotBest() {
  const me = rows.find((row) => String(row.user_id) === String(A?.telegramId));
  preRunBest = me ? Number(me.score) || 0 : 0;
}

async function submitScore(score) {
  if (!A?.canRank || score <= 0) return;
  try {
    await A.callAigramAPI('/note/aigram/ai/game/rank/score/save', 'POST', {
      session_id: A.gameUuid,
      score: Math.round(score)
    });
    if (score > preRunBest && A.telegramId) {
      const fresh = await refreshLeaderboard();
      const beaten = fresh
        .filter((row) => String(row.user_id) !== String(A.telegramId))
        .filter((row) => row.score < score && row.score > preRunBest)
        .sort((a, b) => b.score - a.score)[0];
      if (beaten) {
        A.postAigramAPI('/note/aigram/ai/game/record/play', {
          session_id: A.gameUuid,
          event: 'score_beat',
          config_json: {
            actions: [{
              type: 'notify',
              target_user_id: String(beaten.user_id),
              image: {
                ref_url: 'https://yinxinghuan.github.io/games/posters/gorilla-skyline.png',
                prompt: 'Two gorillas throw a spinning banana over a moonlit city skyline with a windmill.'
              },
              message: {
                template: `{sender_name} just beat your skyline record — ${Math.round(score)} pts on Skyline Gorillas.`,
                variables: ['sender_name']
              }
            }]
          }
        });
      }
    }
    window.setTimeout(refreshLeaderboard, 800);
  } catch {
    // Ranking never blocks the result.
  }
}

function openLeaderboard() {
  renderFullRows();
  leaderboard.classList.add('sg-leaderboard--show');
  if (A?.canRank) refreshLeaderboard();
}

document.querySelector('#lbClose').addEventListener('click', () => leaderboard.classList.remove('sg-leaderboard--show'));
document.querySelector('[data-rank]').addEventListener('click', openLeaderboard);
champion.addEventListener('click', openLeaderboard);
document.querySelector('[data-again]').addEventListener('pointerdown', () => window.Gorillas?.newGame());

window.addEventListener('gorilla:roundstart', () => {
  result.classList.remove('sg-result--show');
  userInteracted = false;
  snapshotBest();
  clearTimeout(ghostTimer);
  if (window.Gorillas) ghostTimer = window.setTimeout(runGhost, 650);
});
window.addEventListener('gorilla:grab', () => {
  stopGhost();
  tone('grab');
});
window.addEventListener('gorilla:throw', () => tone('throw'));
window.addEventListener('gorilla:impact', () => tone('impact'));
window.addEventListener('gorilla:gameover', (event) => {
  const { playerWon, score, round } = event.detail;
  stopGhost();
  resultKicker.textContent = playerWon ? copy.victory : copy.defeat;
  winner.textContent = playerWon ? copy.won : copy.lost;
  finalScore.textContent = String(score);
  finalRound.textContent = String(round);
  result.classList.add('sg-result--show');
  flash.classList.remove('sg-flash--go');
  void flash.offsetWidth;
  flash.classList.add('sg-flash--go');
  tone(playerWon ? 'win' : 'lose');
  if (playerWon) submitScore(score);
});

async function boot() {
  await import('./game.js');
  runGhost();

  if (A?.isInAigram && A.telegramId) {
    try {
      const profile = await A.callAigramAPI(
        `/note/telegram/user/get/info/by/telegram_id?telegram_id=${encodeURIComponent(A.telegramId)}`,
        'GET'
      );
      const data = profile?.data || profile || {};
      window.Gorillas.setPlayerName(data.name || data.user_name || 'AlterU');
    } catch {
      window.Gorillas.setPlayerName('AlterU');
    }
  } else {
    window.Gorillas.setPlayerName('AlterU');
  }

  refreshLeaderboard();
}

boot();

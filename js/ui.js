// Affichage et enchaînement des écrans.

const $ = id => document.getElementById(id);

const RESULT_TITLES = {
    4: 'Pile sur la fréquence',
    3: 'Signal clair',
    2: 'Signal faible',
    0: 'Hors fréquence'
};

const HOLD_MS = 700;
const SAVE_KEY = 'ldo-game';
const THEME_KEY = 'ldo-theme';

let game = null;
let goal = 10;

// --- Sauvegarde : un téléphone qui se verrouille ne doit pas effacer la partie ---
function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(game)); } catch (e) { /* stockage indisponible */ }
}
function load() {
    try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return null; }
}
function clearSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* stockage indisponible */ }
}

// --- Thème : suit le système tant que l'utilisateur n'a rien choisi ---
function isDark() {
    const forced = document.documentElement.dataset.theme;
    return forced ? forced === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
}
function toggleTheme() {
    const theme = isDark() ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* stockage indisponible */ }
}
// (le thème enregistré est appliqué dans le <head>, avant le premier rendu)

// --- Écran de lancement : disparaît seul, ou au premier tap ---
const splash = $('splash');
splash.addEventListener('pointerdown', () => splash.classList.add('is-leaving'));
splash.addEventListener('animationend', e => { if (e.animationName === 'splash-out') splash.remove(); });

// --- Rendu ---
const escapeHTML = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function scaleHTML(pair) {
    return `<span><small>← ${FREQ_MIN}</small>${escapeHTML(pair[0])}</span>` +
           `<span><small>${FREQ_MAX} →</small>${escapeHTML(pair[1])}</span>`;
}

// Chaque zone couvre les valeurs entières à ±maxDiff de la cible, d'où le +1.
// On dessine la plus large d'abord pour que la plus précise reste au-dessus.
function zonesHTML(target) {
    return [...ZONES].reverse().map(({ maxDiff, points, cls }) => {
        const width = 2 * maxDiff + 1;
        const label = maxDiff === ZONES[0].maxDiff ? points : '';
        return `<div class="zone ${cls}" style="left: ${target - width / 2}%; width: ${width}%">${label}</div>`;
    }).join('');
}

const needleHTML = position => `<div class="needle" style="left: ${position}%"></div>`;

function renderScoreboard() {
    game.teams.forEach((team, i) => {
        $(`sb-points-${i}`).textContent = team.score;
        $(`sb-name-${i}`).textContent = team.name;
        $(`sb-${i}`).classList.toggle('is-active', game.turn === i);
    });
    $('sb-goal').textContent = game.goal;
    document.querySelector('.app').classList.toggle('turn-b', game.turn === 1);
}

function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(`screen-${name}`).classList.add('active');

    const inGame = name !== 'setup' && name !== 'win';
    $('scoreboard').hidden = !inGame;
    $('brand').hidden = inGame;
    $('btn-quit').hidden = !inGame;
    $('btn-theme').hidden = inGame; // laisse toute la place au score pendant la partie
    resetQuit();
    if (game) renderScoreboard();
}

function showPass() {
    $('pass-team').textContent = game.teams[game.turn].name;
    showScreen('pass');
}

function showPsychic() {
    const { round } = game;
    $('p-scale').innerHTML = scaleHTML(round.pair);
    $('p-band').innerHTML = zonesHTML(round.target);
    $('clue').value = round.clue;
    showScreen('psychic');
}

function showGuess() {
    const { round } = game;
    $('guess-team').textContent = game.teams[game.turn].name;
    const clue = $('clue-display');
    clue.textContent = round.clue ? `« ${round.clue} »` : 'Écoutez le Psycho';
    clue.classList.toggle('is-empty', !round.clue);
    $('g-scale').innerHTML = scaleHTML(round.pair);
    $('g-band').innerHTML = needleHTML(round.guess);
    setGuess(round.guess);
    showScreen('guess');
}

function showResult() {
    const { round, lastPoints: points } = game;
    $('result-points').textContent = points > 0 ? `+${points}` : '0';
    $('result-points').classList.toggle('is-zero', points === 0);
    $('result-title').textContent = RESULT_TITLES[points];
    [...$('signal').children].forEach((bar, i) => bar.classList.toggle('on', i < points));

    $('r-scale').innerHTML = scaleHTML(round.pair);
    $('r-band').innerHTML = zonesHTML(round.target) + needleHTML(round.guess);
    $('stat-target').textContent = toFrequency(round.target);
    $('stat-guess').textContent = toFrequency(round.guess);
    $('stat-diff').textContent = Math.abs(round.guess - round.target);
    $('btn-next-label').textContent = isWon(game) ? 'Voir le vainqueur' : 'Manche suivante';
    showScreen('result');
}

function showWin() {
    const w = winnerIndex(game);
    $('win-team').textContent = game.teams[w].name;
    $('win-score').textContent = `${game.teams[w].score} – ${game.teams[1 - w].score}`;
    showScreen('win');
}

// --- Réglage : glisser sur la bande, tourner la molette, ou flèches du clavier ---
function setGuess(value) {
    const position = clampPosition(value);
    game.round.guess = position;
    const needle = $('g-band').querySelector('.needle');
    if (needle) needle.style.left = `${position}%`;
    $('g-band').setAttribute('aria-valuenow', position);
    $('g-band').setAttribute('aria-valuetext', `${toFrequency(position)} MHz`);
    $('readout').textContent = toFrequency(position);
    $('knob').style.setProperty('--rot', `${(position - 50) * 3}deg`);
}

function arrowStep(e, step) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { setGuess(game.round.guess + step); e.preventDefault(); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { setGuess(game.round.guess - step); e.preventDefault(); }
}

const band = $('g-band');
const positionFromPointer = e => {
    const rect = band.getBoundingClientRect();
    return (e.clientX - rect.left) / rect.width * 100;
};
band.addEventListener('pointerdown', e => { band.setPointerCapture(e.pointerId); setGuess(positionFromPointer(e)); });
band.addEventListener('pointermove', e => { if (band.hasPointerCapture(e.pointerId)) setGuess(positionFromPointer(e)); });
band.addEventListener('keydown', e => arrowStep(e, e.shiftKey ? 5 : 1));

// La molette avance d'un cran tous les 3° de rotation autour de son centre.
const knob = $('knob');
const DEG_PER_STEP = 3;
let knobAngle = null;
const angleFromPointer = e => {
    const rect = knob.getBoundingClientRect();
    return Math.atan2(e.clientY - (rect.top + rect.height / 2), e.clientX - (rect.left + rect.width / 2)) * 180 / Math.PI;
};
knob.addEventListener('pointerdown', e => { knobAngle = angleFromPointer(e); knob.setPointerCapture(e.pointerId); });
knob.addEventListener('pointermove', e => {
    if (knobAngle === null) return;
    const angle = angleFromPointer(e);
    let delta = angle - knobAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    const steps = Math.trunc(delta / DEG_PER_STEP);
    if (steps) {
        setGuess(game.round.guess + steps);
        knobAngle += steps * DEG_PER_STEP;
    }
});
['pointerup', 'pointercancel'].forEach(t => knob.addEventListener(t, () => { knobAngle = null; }));
knob.addEventListener('keydown', e => arrowStep(e, 1));

// --- Maintenir pour révéler la cible ---
const hold = $('btn-hold');
let holdStart = null;
let holdFrame = 0;

function holdTick(now) {
    if (holdStart === null) return;
    const progress = Math.min(1, (now - holdStart) / HOLD_MS);
    hold.style.setProperty('--progress', progress);
    if (progress < 1) {
        holdFrame = requestAnimationFrame(holdTick);
        return;
    }
    stopHold();
    showPsychic();
}
function startHold(e) {
    e.preventDefault();
    holdStart = performance.now();
    holdFrame = requestAnimationFrame(holdTick);
}
function stopHold() {
    holdStart = null;
    cancelAnimationFrame(holdFrame);
    hold.style.setProperty('--progress', 0);
}
hold.addEventListener('pointerdown', startHold);
['pointerup', 'pointerleave', 'pointercancel'].forEach(t => hold.addEventListener(t, stopHold));
hold.addEventListener('keydown', e => {
    if ((e.key === ' ' || e.key === 'Enter') && holdStart === null && !e.repeat) startHold(e);
});
hold.addEventListener('keyup', stopHold);
hold.addEventListener('contextmenu', e => e.preventDefault());

// --- Quitter : un premier tap arme, le second confirme ---
let quitTimer = 0;
function resetQuit() {
    clearTimeout(quitTimer);
    $('btn-quit').classList.remove('is-confirming');
}
$('btn-quit').addEventListener('click', () => {
    const btn = $('btn-quit');
    if (!btn.classList.contains('is-confirming')) {
        btn.classList.add('is-confirming');
        quitTimer = setTimeout(resetQuit, 3000);
        return;
    }
    clearSave();
    showScreen('setup');
});

// --- Enchaînement ---
function nextRound() {
    game.round = newRound(game.round.pair);
    game.lastPoints = null;
    save();
    showPass();
}

function setGoal(value) {
    goal = value;
    document.querySelectorAll('#goal-picker button').forEach(b => b.setAttribute('aria-pressed', Number(b.dataset.goal) === value));
}
document.querySelectorAll('#goal-picker button').forEach(btn => btn.addEventListener('click', () => setGoal(Number(btn.dataset.goal))));

$('btn-start').addEventListener('click', () => {
    const names = [0, 1].map(i => $(`team-name-${i}`).value.trim() || `Équipe ${i + 1}`);
    game = newGame(names, goal);
    save();
    showPass();
});

$('btn-shuffle').addEventListener('click', () => {
    const clue = $('clue').value;
    game.round = newRound(game.round.pair);
    game.round.clue = clue;
    save();
    showPsychic();
});

$('btn-hide').addEventListener('click', () => {
    game.round.clue = $('clue').value.trim();
    save();
    showGuess();
});

$('btn-lock').addEventListener('click', () => {
    const points = computeScore(game.round.guess, game.round.target);
    game.lastPoints = points;
    game.teams[game.turn].score += points;
    save();
    showResult();
    if (points) {
        const el = $(`sb-${game.turn}`);
        el.classList.remove('bump');
        void el.offsetWidth;
        el.classList.add('bump');
    }
});

$('btn-next').addEventListener('click', () => {
    if (isWon(game)) {
        clearSave();
        showWin();
        return;
    }
    game.turn = 1 - game.turn;
    nextRound();
});

$('btn-rematch').addEventListener('click', () => {
    game = newGame(game.teams.map(t => t.name), game.goal);
    save();
    showPass();
});

$('btn-new').addEventListener('click', () => showScreen('setup'));
$('btn-theme').addEventListener('click', toggleTheme);

// --- Démarrage : reprendre une partie en cours, sans jamais rouvrir sur la cible ---
const saved = load();
if (saved && saved.teams && saved.round) {
    game = saved;
    setGoal(game.goal);
    game.teams.forEach((t, i) => { $(`team-name-${i}`).value = t.name; });
    if (game.lastPoints !== null) showResult();
    else showPass();
} else {
    showScreen('setup');
}

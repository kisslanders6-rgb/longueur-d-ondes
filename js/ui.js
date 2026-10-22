// Affichage et enchaînement des écrans.

let round = null;

const $ = id => document.getElementById(id);

function toggleTheme() {
    const isLight = document.body.classList.toggle('light');
    $('sun').classList.toggle('hidden', !isLight);
    $('moon').classList.toggle('hidden', isLight);
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(id).classList.add('active');
}

function setLabels(prefix, pair) {
    $(`${prefix}-label-left`).innerText = pair[0];
    $(`${prefix}-label-right`).innerText = pair[1];
}

// Chaque zone couvre les valeurs entières à ±maxDiff de la cible, d'où le +1.
function createTargetHTML(position) {
    return ZONES.map(({ maxDiff, cls }) => {
        const width = 2 * maxDiff + 1;
        return `<div class="target-block ${cls}" style="left: ${position - width / 2}%; width: ${width}%"></div>`;
    }).join('');
}

function startGame() {
    round = newRound(round && round.pair);
    setLabels('p', round.pair);
    $('target-psychic').innerHTML = createTargetHTML(round.target);
    showScreen('screen-psychic');
}

function goToGuessing() {
    setLabels('g', round.pair);
    $('user-guess').value = 50;
    showScreen('screen-guess');
}

const RESULTS = {
    perfect: { title: "Télépathie confirmée", cls: "is-perfect" },
    close:   { title: "Presque synchro",      cls: "is-close" },
    miss:    { title: "Erreur de signal",     cls: "is-miss" }
};

function revealResult() {
    const guess = parseInt($('user-guess').value, 10);
    const score = computeScore(guess, round.target);
    const maxPoints = ZONES[0].points;

    setLabels('r', round.pair);
    $('final-target-zone').innerHTML =
        createTargetHTML(round.target) +
        `<div class="user-marker" style="left: ${guess}%"></div>`;

    const result = score === maxPoints ? RESULTS.perfect : score > 0 ? RESULTS.close : RESULTS.miss;
    $('score-badge').className = `score-badge ${result.cls}`;
    $('score-value').innerText = score > 0 ? `+${score}` : '0';
    $('score-unit').innerText = score > 1 ? 'POINTS' : 'POINT';
    $('result-title').innerText = result.title;

    $('stat-target').innerText = round.target;
    $('stat-guess').innerText = guess;
    $('stat-diff').innerText = Math.abs(guess - round.target);

    showScreen('screen-result');
}

$('themeBtn').addEventListener('click', toggleTheme);
$('btn-start').addEventListener('click', startGame);
$('btn-clue-given').addEventListener('click', goToGuessing);
$('btn-confirm').addEventListener('click', revealResult);
$('btn-menu').addEventListener('click', () => showScreen('screen-start'));
$('btn-next').addEventListener('click', startGame);

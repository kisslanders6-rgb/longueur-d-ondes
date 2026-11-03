// Logique du jeu, sans accès au DOM.

// Zones de score, de la plus précise à la plus large. Source unique de vérité :
// l'affichage des cibles et le calcul des points en découlent tous les deux.
const ZONES = [
    { maxDiff: 2, points: 4, cls: 'z3' },
    { maxDiff: 5, points: 3, cls: 'z2' },
    { maxDiff: 8, points: 2, cls: 'z1' }
];

// Marge pour que la zone la plus large reste entièrement sur l'échelle (0–100).
const TARGET_MARGIN = 10;

// L'échelle 0–100 s'affiche comme une bande FM de 88 à 108 MHz.
const FREQ_MIN = 88;
const FREQ_MAX = 108;

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clampPosition(value) {
    return Math.max(0, Math.min(100, Math.round(value)));
}

function toFrequency(position) {
    return (FREQ_MIN + position * (FREQ_MAX - FREQ_MIN) / 100).toFixed(1);
}

// Tire une nouvelle manche, en évitant de reproposer la même paire.
function newRound(previousPair) {
    let pair;
    do {
        pair = OPPOSITES[randomInt(0, OPPOSITES.length - 1)];
    } while (previousPair && pair[0] === previousPair[0] && OPPOSITES.length > 1);

    return {
        pair,
        target: randomInt(TARGET_MARGIN, 100 - TARGET_MARGIN),
        guess: 50,
        clue: ''
    };
}

function computeScore(guess, target) {
    const diff = Math.abs(guess - target);
    const zone = ZONES.find(z => diff <= z.maxDiff);
    return zone ? zone.points : 0;
}

// Une partie : deux équipes qui jouent à tour de rôle jusqu'à l'objectif.
function newGame(names, goal) {
    return {
        teams: names.map(name => ({ name, score: 0 })),
        goal,
        turn: 0,
        round: newRound(null),
        lastPoints: null
    };
}

function isWon(game) {
    return game.teams[game.turn].score >= game.goal;
}

function winnerIndex(game) {
    return game.teams[0].score >= game.teams[1].score ? 0 : 1;
}

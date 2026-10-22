// Logique du jeu, sans accès au DOM.

// Zones de score, de la plus précise à la plus large. Source unique de vérité :
// l'affichage des cibles et le calcul des points en découlent tous les deux.
const ZONES = [
    { maxDiff: 2, points: 4, cls: 't-center' },
    { maxDiff: 5, points: 3, cls: 't-mid' },
    { maxDiff: 8, points: 2, cls: 't-wide' }
];

// Marge pour que la zone la plus large reste entièrement sur l'échelle (0–100).
const TARGET_MARGIN = 10;

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Tire une nouvelle manche, en évitant de reproposer la même paire.
function newRound(previousPair) {
    let pair;
    do {
        pair = OPPOSITES[randomInt(0, OPPOSITES.length - 1)];
    } while (pair === previousPair && OPPOSITES.length > 1);

    return {
        pair,
        target: randomInt(TARGET_MARGIN, 100 - TARGET_MARGIN)
    };
}

function computeScore(guess, target) {
    const diff = Math.abs(guess - target);
    const zone = ZONES.find(z => diff <= z.maxDiff);
    return zone ? zone.points : 0;
}

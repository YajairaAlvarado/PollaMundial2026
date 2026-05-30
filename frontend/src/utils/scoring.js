/**
 * Calculate points earned for a prediction
 * 3 pts: exact score
 * 2 pts: correct winner/draw
 * 0 pts: wrong
 */
export function calculatePoints(prediction, result) {
  if (!prediction || !result) return 0;

  const { home_score: predHome, away_score: predAway } = prediction;
  const { home_score: actualHome, away_score: actualAway } = result;

  if (actualHome === null || actualAway === null) return 0;

  // Exact score
  if (predHome === actualHome && predAway === actualAway) {
    return 3;
  }

  // Correct result (winner/draw)
  const actualResult = getResultType(actualHome, actualAway);
  const predResult = getResultType(predHome, predAway);

  if (actualResult === predResult) {
    return 2;
  }

  return 0;
}

/**
 * Get result type: 'home' | 'away' | 'draw'
 */
export function getResultType(homeScore, awayScore) {
  if (homeScore > awayScore) return 'home';
  if (awayScore > homeScore) return 'away';
  return 'draw';
}

/**
 * Get label for result type
 */
export function getResultLabel(homeScore, awayScore) {
  const type = getResultType(homeScore, awayScore);
  if (type === 'home') return 'Victoria local';
  if (type === 'away') return 'Victoria visitante';
  return 'Empate';
}

/**
 * Get prediction status for display
 */
export function getPredictionStatus(prediction, match) {
  if (!prediction) return 'none';
  if (match.status === 'scheduled' || match.status === 'live') return 'pending';
  if (match.status !== 'finished') return 'pending';

  const points = prediction.points_earned;
  if (points === 3) return 'exact';
  if (points === 2) return 'correct';
  return 'wrong';
}

/**
 * Status labels and colors
 */
export const STATUS_CONFIG = {
  exact: { label: 'Exacto', className: 'result-exact', points: 3 },
  correct: { label: 'Correcto', className: 'result-correct', points: 2 },
  wrong: { label: 'Incorrecto', className: 'result-wrong', points: 0 },
  pending: { label: 'Pendiente', className: 'result-pending', points: null },
  none: { label: 'Sin predicción', className: 'result-pending', points: null },
};

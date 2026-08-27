import { getPart, usageHistory } from '../data/index.js';

const RECENT_WINDOW = 5;
const ANOMALY_Z_THRESHOLD = 3.0;
const COVERAGE_DAYS = 30;

function mean(values) {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stddev(values, avg) {
  const variance = mean(values.map((v) => (v - avg) ** 2));
  return Math.sqrt(variance);
}

export function runDemandPrediction(partId) {
  const part = getPart(partId);
  const history = usageHistory[partId] || [];

  const baseline = history.slice(0, -RECENT_WINDOW);
  const recent = history.slice(-RECENT_WINDOW);

  const baselineAvg = mean(baseline);
  const baselineStd = stddev(baseline, baselineAvg);
  const recentAvg = mean(recent);

  // Test the recent *mean* against the baseline mean, not a single day against
  // it. Dividing by the standard error rather than the raw standard deviation
  // is what makes a sustained shift detectable: day-to-day noise (weekend
  // shutdowns especially) inflates baselineStd enough to hide a real 3-5x
  // spike otherwise.
  const standardError = baselineStd / Math.sqrt(RECENT_WINDOW);
  const zScore = standardError > 0 ? (recentAvg - baselineAvg) / standardError : 0;
  const anomalyDetected = zScore >= ANOMALY_Z_THRESHOLD;

  const dailyRate = recentAvg;
  const daysUntilStockout = dailyRate > 0 ? Math.floor(part.currentStock / dailyRate) : null;
  const predictedQuantity = Math.max(1, Math.ceil(dailyRate * COVERAGE_DAYS) - part.currentStock);

  const reasoning = anomalyDetected
    ? `Recent ${RECENT_WINDOW}-day usage averages ${recentAvg.toFixed(1)}/day against a ${baselineAvg.toFixed(1)}/day baseline (z=${zScore.toFixed(1)}). This spike exceeds normal wear patterns and may indicate equipment failure rather than routine consumption — flagging for human review.`
    : `Recent ${RECENT_WINDOW}-day usage averages ${recentAvg.toFixed(1)}/day, consistent with the ${baselineAvg.toFixed(1)}/day baseline (z=${zScore.toFixed(1)}). Consumption looks like routine wear. At current stock of ${part.currentStock} units, stockout is projected in ${daysUntilStockout} days.`;

  return {
    agent: 'Demand Prediction',
    partId,
    partName: part.name,
    currentStock: part.currentStock,
    reorderThreshold: part.reorderThreshold,
    baselineDailyRate: Number(baselineAvg.toFixed(2)),
    recentDailyRate: Number(recentAvg.toFixed(2)),
    zScore: Number(zScore.toFixed(2)),
    anomalyDetected,
    daysUntilStockout,
    predictedQuantity,
    reasoning,
  };
}

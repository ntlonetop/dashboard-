export function getBucketKey(type) {
  const d = /* @__PURE__ */ new Date();
  if (type === "day") return `d_${d.getFullYear()}_${d.getMonth()}_${d.getDate()}`;
  if (type === "month") return `m_${d.getFullYear()}_${d.getMonth()}`;
  if (type === "year") return `y_${d.getFullYear()}`;
  const ms = d.getTime();
  const week = Math.floor(ms / (1e3 * 60 * 60 * 24 * 7));
  return `w_${week}`;
}
export function getXpRequired(typeConfig, targetLevel) {
  if (typeConfig.xpMode === "static") {
    const staticEntry = typeConfig.staticLevels?.find((sl) => sl.level === targetLevel);
    if (staticEntry) return Number(staticEntry.xp);
    return Number(typeConfig.baseXp || 1e3);
  }
  const interval = typeConfig.intervals?.find((inv) => targetLevel >= inv.from && targetLevel <= inv.to);
  const baseXp = Number(interval?.baseXp || typeConfig.baseXp || 1e3);
  const incrementXp = Number(interval?.incrementXp || typeConfig.incrementXp || 1e3);
  const everyNLevels = Number(interval?.everyNLevels || typeConfig.everyNLevels || 5);
  const relativeLevel = interval ? targetLevel - interval.from : targetLevel - 1;
  const incMult = Math.floor(relativeLevel / (everyNLevels || 1));
  const req = baseXp + incMult * incrementXp;
  return Math.max(1, req);
}
export function calculateLevelFromTotalXp(typeConfig, totalXp) {
  let level = 1;
  let remainingXp = Number(totalXp) || 0;
  if (isNaN(remainingXp)) remainingXp = 0;
  let safety = 0;
  while (safety < 1e4) {
    safety++;
    const req = getXpRequired(typeConfig, level);
    if (remainingXp >= req) {
      remainingXp -= req;
      level++;
    } else {
      break;
    }
  }
  return { level, currentXp: remainingXp, nextReq: getXpRequired(typeConfig, level) };
}

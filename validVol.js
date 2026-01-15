/**
 * Snap a value to multiples of `step`.
 * @param {number} value - user-entered volume
 * @param {number} step  - step size (e.g. 0.01, 0.1, 10, 100)
 * @param {'nearest'|'down'|'up'} mode - rounding mode
 * @returns {number} valid volume aligned to the step
 */
function snapToStep(value, step, mode = 'nearest') {
    if (!(isFinite(value) && isFinite(step)) || step <= 0) {
      throw new Error('Invalid value or step');
    }
  
    const kRaw = value / step;
    let k;
    switch (mode) {
      case 'down':   k = Math.floor(kRaw + 1e-12); break; // floor
      case 'up':     k = Math.ceil (kRaw - 1e-12); break; // ceil
      default:       k = Math.round(kRaw);                // nearest
    }
  
    const snapped = k * step;
  
    // Round to the same decimal places as the step to avoid 0.009999... artifacts
    const dp = decimalPlaces(step);
    return Number(snapped.toFixed(dp));
  }
  
  function decimalPlaces(n) {
    const s = String(n);
    const dot = s.indexOf('.');
    return dot === -1 ? 0 : s.length - dot - 1;
  }
  
  // --- examples ---
  console.log(snapToStep(0.015, 0.01));          // 0.02 (nearest)
  console.log(snapToStep(233,    10));           // 230
  console.log(snapToStep(235,    10));           // 240
  console.log(snapToStep(1.01,   0.01, 'down')); // 1.01 (already aligned)
  console.log(snapToStep(1.019,  0.01, 'down')); // 1.01
  console.log(snapToStep(1.011,  0.01, 'up'));   // 1.02
  
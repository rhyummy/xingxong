// Deterministic synthetic dataset for SupplyChain Sentinel.
//
// No public dataset pairs spare-parts consumption with supplier pricing, lead
// times and reliability — that data is commercially sensitive. This models the
// patterns instead: steady wear plus weekly seasonality, occasional genuine
// failure spikes, and suppliers whose price/lead-time/quality attributes trade
// off against each other the way real vendors do.
//
// Seeded RNG so every run of the demo produces the same numbers.

const SEED = 20260827;
const DAYS = 90;

// mulberry32 — small, fast, good enough for synthetic data.
function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = makeRng(SEED);
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
const between = (min, max) => min + rng() * (max - min);
const intBetween = (min, max) => Math.floor(between(min, max + 1));
const round2 = (n) => Number(n.toFixed(2));

// Costs are in INR, at magnitudes typical of Indian industrial MRO supply.
const CATEGORIES = [
  { name: 'Hydraulics', costRange: [2000, 26000], nouns: ['Pump Seal Kit', 'Cylinder Rod', 'Pressure Valve', 'Hose Assembly', 'Accumulator Bladder', 'Spool Valve'] },
  { name: 'Electrical', costRange: [3500, 75000], nouns: ['Servo Motor Bearing', 'Control Relay', 'Contactor Block', 'Encoder Module', 'Power Supply Unit', 'Signal Isolator'] },
  { name: 'Pneumatics', costRange: [700, 15000], nouns: ['Air Filter Cartridge', 'Solenoid Valve', 'Rotary Actuator', 'Pressure Regulator', 'Quick Coupler'] },
  { name: 'Mechanical', costRange: [1000, 33000], nouns: ['Drive Belt', 'Roller Chain', 'Gearbox Coupling', 'Thrust Bearing', 'Sprocket Set', 'Shaft Collar'] },
  { name: 'Consumables', costRange: [250, 5000], nouns: ['Lubricant Cartridge', 'Gasket Sheet', 'Weld Tip', 'Abrasive Disc', 'Filter Element'] },
];

const LINES = ['Line A', 'Line B', 'Line C', 'Press Shop', 'Paint Shop'];
const REGIONS = ['Pune, IN', 'Chennai, IN', 'Shenzhen, CN', 'Stuttgart, DE', 'Detroit, US', 'Monterrey, MX'];

const SUPPLIER_PREFIXES = ['Apex', 'Meridian', 'Precision', 'Continental', 'Vertex', 'Ironclad', 'Nova', 'BlueRidge', 'Summit', 'Trident', 'Kestrel', 'Anvil', 'Orbit', 'Pioneer', 'Cardinal'];
const SUPPLIER_SUFFIXES = ['Industrial', 'Components', 'Engineering', 'Supply Co.', 'Manufacturing', 'Parts Group', 'Automation', 'Systems'];

/**
 * Suppliers sit on a quality/price spectrum. `tier` drives every attribute so
 * they correlate the way real vendors do: premium suppliers cost more but
 * ship faster with fewer defects, budget suppliers are the reverse. Without
 * this correlation the ranking agent has nothing interesting to weigh.
 */
function generateSuppliers(count) {
  const suppliers = [];
  const usedNames = new Set();

  for (let i = 0; i < count; i++) {
    let name;
    do {
      name = `${pick(SUPPLIER_PREFIXES)} ${pick(SUPPLIER_SUFFIXES)}`;
    } while (usedNames.has(name));
    usedNames.add(name);

    // 0 = budget, 1 = premium
    const tier = rng();

    suppliers.push({
      id: `S-${String(i + 1).padStart(3, '0')}`,
      name,
      region: pick(REGIONS),
      tier,
      reliabilityScore: Math.round(58 + tier * 40 + between(-4, 4)),
      defectRatePct: round2(Math.max(0.1, 4.8 - tier * 4.4 + between(-0.3, 0.3))),
    });
  }

  return suppliers.map((s) => ({
    ...s,
    reliabilityScore: Math.min(99, Math.max(50, s.reliabilityScore)),
  }));
}

/**
 * Daily consumption = a steady wear baseline, a weekly rhythm (weekends run
 * lighter), and Poisson-ish noise. A few parts additionally get a failure
 * spike in the final days — that's what the anomaly agent must catch.
 */
function generateUsage(part, hasSpike) {
  const series = [];
  const baseline = part.baselineDailyRate;

  for (let day = 0; day < DAYS; day++) {
    const dayOfWeek = day % 7;
    const weekendFactor = dayOfWeek === 5 || dayOfWeek === 6 ? 0.35 : 1;
    const noise = between(0.6, 1.4);

    let units = baseline * weekendFactor * noise;

    // Failure spike in the last 5 days: consumption jumps 3-5x.
    if (hasSpike && day >= DAYS - 5) {
      units *= between(3, 5);
    }

    series.push(Math.max(0, Math.round(units)));
  }

  return series;
}

export function generateDataset() {
  const suppliers = generateSuppliers(15);
  const parts = [];
  const partSuppliers = [];
  const usage = {};

  let partIndex = 0;

  for (const category of CATEGORIES) {
    const countInCategory = intBetween(7, 9);

    for (let i = 0; i < countInCategory; i++) {
      partIndex++;
      const id = `P-${1000 + partIndex}`;
      const unitCost = round2(between(category.costRange[0], category.costRange[1]));
      const baselineDailyRate = round2(between(0.3, 4.5));

      // Cheap, fast-moving parts are stocked deep; expensive ones run lean.
      const reorderThreshold = Math.max(4, Math.round(baselineDailyRate * intBetween(5, 12)));

      // ~40% of parts are sitting at or below their reorder point, so the
      // dashboard always has something worth triggering.
      const belowThreshold = rng() < 0.4;
      const currentStock = belowThreshold
        ? intBetween(1, Math.max(2, reorderThreshold - 1))
        : intBetween(reorderThreshold + 1, reorderThreshold * 3);

      const criticality = unitCost > 33000 ? 'critical' : unitCost > 10000 ? 'high' : 'standard';

      const part = {
        id,
        name: `${pick(category.nouns)} — ${pick(LINES)}`,
        category: category.name,
        currentStock,
        reorderThreshold,
        unitCost,
        criticality,
        baselineDailyRate,
      };
      parts.push(part);

      // ~15% of parts are single-sourced — the dependency risk the agent flags.
      const supplierCount = rng() < 0.15 ? 1 : intBetween(2, 4);
      const chosen = [];
      while (chosen.length < supplierCount) {
        const s = pick(suppliers);
        if (!chosen.find((c) => c.id === s.id)) chosen.push(s);
      }

      for (const s of chosen) {
        // Premium tier: pricier but faster. Budget tier: cheaper but slow.
        const priceFactor = 0.82 + s.tier * 0.4 + between(-0.05, 0.05);
        const leadTime = Math.round(16 - s.tier * 12 + between(-2, 2));

        partSuppliers.push({
          partId: id,
          supplierId: s.id,
          price: round2(unitCost * priceFactor),
          leadTimeDays: Math.min(21, Math.max(2, leadTime)),
        });
      }

      // ~12% of parts show a genuine failure spike.
      usage[id] = generateUsage(part, rng() < 0.12);
    }
  }

  // Strip the generator-only field before it reaches the app.
  const cleanParts = parts.map(({ baselineDailyRate, ...p }) => p);
  const cleanSuppliers = suppliers.map(({ tier, ...s }) => s);

  return { parts: cleanParts, suppliers: cleanSuppliers, partSuppliers, usage, days: DAYS };
}

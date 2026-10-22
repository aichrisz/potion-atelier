(function (root) {
  "use strict";
  const freeze = (value) => {
    if (value && typeof value === "object") {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  };
  const INGREDIENTS = freeze([
    { id: "moon-lavender", name: "Lavender Bulan", glyph: "❋" },
    { id: "dew", name: "Embun Kristal", glyph: "◇" },
    { id: "ember-cap", name: "Jamur Lentera", glyph: "♧" },
    { id: "rose", name: "Kelopak Senja", glyph: "❀" },
    { id: "star-anise", name: "Anis Bintang", glyph: "✶" },
    { id: "mint", name: "Mint Perak", glyph: "❧" },
  ]);
  const RECIPES = freeze([
    {
      id: "embun-tidur",
      name: "Embun Tidur",
      ingredients: ["moon-lavender", "dew", "mint"],
      heat: [38, 48],
      stir: [35, 55],
      base: 24,
      color: "#bd9bd3",
    },
    {
      id: "kelopak-pulih",
      name: "Kelopak Pulih",
      ingredients: ["rose", "dew", "mint"],
      heat: [60, 70],
      stir: [50, 70],
      base: 28,
      color: "#e79a87",
    },
    {
      id: "pijar-berani",
      name: "Pijar Berani",
      ingredients: ["ember-cap", "rose", "star-anise"],
      heat: [72, 82],
      stir: [65, 82],
      base: 32,
      color: "#e6b34d",
    },
    {
      id: "ingatan-bening",
      name: "Ingatan Bening",
      ingredients: ["moon-lavender", "dew", "star-anise"],
      heat: [45, 55],
      stir: [25, 45],
      base: 30,
      color: "#a2cbc2",
    },
    {
      id: "senyum-senja",
      name: "Senyum Senja",
      ingredients: ["rose", "star-anise", "mint"],
      heat: [55, 65],
      stir: [40, 58],
      base: 34,
      color: "#c3cd79",
    },
    {
      id: "langkah-ringan",
      name: "Langkah Ringan",
      ingredients: ["moon-lavender", "ember-cap", "mint"],
      heat: [30, 40],
      stir: [30, 50],
      base: 36,
      color: "#75b394",
    },
  ]);
  const DEFAULT = freeze({
    version: 1,
    completedShifts: 0,
    totalCoins: 0,
    bestShiftCoins: 0,
    bestQuality: 0,
    reputation: 50,
  });
  const LIMITS = {
    completedShifts: 100000,
    totalCoins: 1e9,
    bestShiftCoins: 1e7,
    bestQuality: 100,
    reputation: 100,
  };
  const copy = (value) => JSON.parse(JSON.stringify(value));
  function sanitizeProfile(raw) {
    if (typeof raw === "string") {
      if (raw.length > 1024) return { ...DEFAULT };
      try {
        raw = JSON.parse(raw);
      } catch {
        return { ...DEFAULT };
      }
    }
    const p = { ...DEFAULT };
    if (
      !raw ||
      typeof raw !== "object" ||
      Array.isArray(raw) ||
      raw.version !== 1
    )
      return p;
    for (const [key, max] of Object.entries(LIMITS)) {
      if (
        Object.hasOwn(raw, key) &&
        Number.isInteger(raw[key]) &&
        raw[key] >= 0 &&
        raw[key] <= max
      )
        p[key] = raw[key];
    }
    return p;
  }
  const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
  const distance = (n, band) => Math.max(band[0] - n, 0, n - band[1]);
  function create({ profile } = {}) {
    let saved = sanitizeProfile(profile);
    let s = {
      phase: "ready",
      remaining: 180,
      coins: 0,
      served: 0,
      good: 0,
      qualityTotal: 0,
      bestQuality: 0,
      reputation: saved.reputation,
    };
    let orderIndex = 0;
    const unlocked = () => Math.min(6, 3 + saved.completedShifts);
    function clearBrew() {
      Object.assign(s, {
        stage: "ingredients",
        ingredients: [],
        temperature: 20,
        fire: 60,
        heatElapsed: 0,
        stirElapsed: 0,
        stirPosition: 0,
        potion: null,
      });
    }
    clearBrew();
    s.order = RECIPES[0];
    const reject = (reason) => ({ accepted: false, reason });
    const accept = (event) => ({ accepted: true, event });
    const active = () => s.phase === "running";
    function finish() {
      // The phase guard is the transaction boundary: profile credit occurs once.
      if (!active()) return;
      s.phase = "results";
      saved = sanitizeProfile({
        version: 1,
        completedShifts: Math.min(100000, saved.completedShifts + 1),
        totalCoins: Math.min(1e9, saved.totalCoins + s.coins),
        bestShiftCoins: Math.max(saved.bestShiftCoins, s.coins),
        bestQuality: Math.max(saved.bestQuality, s.bestQuality),
        reputation: s.reputation,
      });
    }
    return {
      startShift() {
        if (s.phase !== "ready" && s.phase !== "results")
          return reject("Selesaikan giliran ini dahulu.");
        orderIndex = saved.completedShifts > 0 ? unlocked() - 1 : 0;
        s = {
          phase: "running",
          remaining: 180,
          coins: 0,
          served: 0,
          good: 0,
          qualityTotal: 0,
          bestQuality: 0,
          reputation: saved.reputation,
          order: RECIPES[orderIndex],
        };
        clearBrew();
        return accept("started");
      },
      pause() {
        if (!active()) return reject("Tidak sedang berlangsung.");
        s.phase = "paused";
        return accept("paused");
      },
      resume() {
        if (s.phase !== "paused") return reject("Tidak dijeda.");
        s.phase = "running";
        return accept("resumed");
      },
      toggleIngredient(id) {
        if (!active() || s.stage !== "ingredients")
          return reject("Pilih bahan pada tahap pertama.");
        if (!INGREDIENTS.some((x) => x.id === id))
          return reject("Bahan tidak dikenal.");
        const index = s.ingredients.indexOf(id);
        if (index >= 0) s.ingredients.splice(index, 1);
        else {
          if (s.ingredients.length === 3) return reject("Maksimal tiga bahan.");
          s.ingredients.push(id);
        }
        return accept("selected");
      },
      resetBrew() {
        if (!active()) return reject("Lanjutkan dahulu.");
        clearBrew();
        return accept("reset");
      },
      setHeat(power) {
        if (
          !active() ||
          s.stage !== "heating" ||
          typeof power !== "number" ||
          !Number.isFinite(power) ||
          power < 0 ||
          power > 100
        )
          return reject("Api harus 0–100 saat memanaskan.");
        s.fire = power;
        return accept("fire");
      },
      step(seconds) {
        if (
          !active() ||
          typeof seconds !== "number" ||
          !Number.isFinite(seconds) ||
          seconds <= 0
        )
          return;
        // Integrate only active time, including the final partial frame. Never catch up a paused clock.
        const dt = Math.min(seconds, s.remaining);
        if (s.stage === "heating") {
          const equilibrium = 20 + 1.6 * s.fire;
          s.temperature = clamp(
            equilibrium + (s.temperature - equilibrium) * Math.exp(-0.1 * dt),
            20,
            100,
          );
          s.heatElapsed += dt;
        } else if (s.stage === "stirring") {
          s.stirElapsed += dt;
          const cycle = s.stirElapsed % 2.4;
          s.stirPosition = clamp(
            ((cycle <= 1.2 ? cycle : 2.4 - cycle) / 1.2) * 100,
            0,
            100,
          );
        }
        s.remaining = Math.max(0, s.remaining - dt);
        if (s.remaining === 0) finish();
      },
      advance() {
        if (!active()) return reject("Giliran tidak aktif.");
        if (s.stage === "ingredients") {
          if (s.ingredients.length !== 3)
            return reject("Pilih tepat tiga bahan.");
          s.stage = "heating";
          return accept("heating");
        }
        if (s.stage === "heating") {
          if (s.heatElapsed < 1) return reject("Panaskan setidaknya 1 detik.");
          s.stage = "stirring";
          return accept("stirring");
        }
        if (s.stage === "stirring") {
          if (s.stirElapsed < 0.25)
            return reject("Aduk setidaknya 0,25 detik.");
          const ingredient = s.order.ingredients.every((id) =>
            s.ingredients.includes(id),
          )
            ? 60
            : 0;
          const heat = Math.max(0, 20 - distance(s.temperature, s.order.heat));
          const stir = Math.max(
            0,
            20 - 0.8 * distance(s.stirPosition, s.order.stir),
          );
          const quality = clamp(Math.round(ingredient + heat + stir), 0, 100);
          s.potion = {
            quality,
            ingredient,
            heat,
            stir,
            reward:
              quality < 50
                ? 0
                : Math.round(s.order.base * (quality / 100) ** 2),
          };
          s.stage = "bottled";
          return accept("bottled");
        }
        // Consuming the bottle and changing stage makes repeated serve activation harmless.
        const p = s.potion;
        s.coins += p.reward;
        s.served++;
        s.good += Number(p.quality >= 50);
        s.qualityTotal += p.quality;
        s.bestQuality = Math.max(s.bestQuality, p.quality);
        s.reputation = clamp(
          s.reputation + (p.quality >= 85 ? 3 : p.quality >= 50 ? 1 : -4),
          0,
          100,
        );
        orderIndex = (orderIndex + 1) % unlocked();
        s.order = RECIPES[orderIndex];
        clearBrew();
        return accept("served");
      },
      snapshot() {
        return copy({
          ...s,
          unlockedCount: unlocked(),
          averageQuality: s.served ? s.qualityTotal / s.served : 0,
        });
      },
      profile() {
        return { ...saved };
      },
    };
  }
  const Engine = Object.freeze({
    create,
    sanitizeProfile,
    INGREDIENTS,
    RECIPES,
  });
  if (typeof module !== "undefined") module.exports = Engine;
  else (root.Potion ||= {}).Engine = Engine;
})(globalThis);

(function (root) {
  "use strict";
  const E = root.Potion.Engine;
  const $ = (id) => document.getElementById(id);
  const names = (ids) =>
    ids.map((id) => E.INGREDIENTS.find((x) => x.id === id).name);
  function create() {
    const ingredientButtons = E.INGREDIENTS.map((item) => {
      const button = document.createElement("button");
      button.dataset.ingredient = item.id;
      button.setAttribute("aria-pressed", "false");
      const glyph = document.createElement("span");
      glyph.textContent = item.glyph;
      glyph.setAttribute("aria-hidden", "true");
      button.append(glyph, document.createTextNode(item.name));
      $("ingredients").append(button);
      return button;
    });
    let lastOrder = "",
      lastUnlock = 0;
    function text(id, value) {
      const node = $(id);
      if (node.textContent !== String(value)) node.textContent = value;
    }
    function band(id, range, low = 0, width = 100) {
      $(id).style.left = `${((range[0] - low) / width) * 100}%`;
      $(id).style.width = `${((range[1] - range[0]) / width) * 100}%`;
    }
    return {
      announce(message) {
        text("feedback", message);
      },
      render(s, profile) {
        document.body.dataset.phase = s.phase;
        text(
          "phase",
          {
            ready: "Siap meracik",
            running: "Berlangsung",
            paused: "Dijeda",
            results: "Selesai",
          }[s.phase],
        );
        text("time", Math.ceil(s.remaining));
        text("coins", s.coins);
        text("reputation", s.reputation);
        $("welcome").hidden = s.phase !== "ready";
        $("pause").disabled = s.phase !== "running";
        text(
          "stage-title",
          {
            ingredients: "1 · Pilih tiga bahan",
            heating: "2 · Jaga hangatnya",
            stirring: "3 · Temukan ritmenya",
            bottled: "Siap untuk diserahkan",
          }[s.stage],
        );
        for (const [id, stage] of [
          ["ingredient-stage", "ingredients"],
          ["heat-stage", "heating"],
          ["stir-stage", "stirring"],
          ["bottle-stage", "bottled"],
        ])
          $(id).hidden = s.stage !== stage;
        for (const button of ingredientButtons) {
          button.disabled = s.phase !== "running" || s.stage !== "ingredients";
          button.setAttribute(
            "aria-pressed",
            String(s.ingredients.includes(button.dataset.ingredient)),
          );
        }
        $("primary").disabled = s.phase !== "running";
        $("reset").disabled = s.phase !== "running";
        text(
          "primary",
          {
            ingredients: "Panaskan racikan",
            heating: "Angkat kuali",
            stirring: "Botolkan sekarang",
            bottled: "Serahkan ramuan",
          }[s.stage],
        );
        text("temperature", `${s.temperature.toFixed(1)}°`);
        text("fire-value", s.fire);
        $("fire").value = s.fire;
        $("fire").disabled = s.phase !== "running" || s.stage !== "heating";
        $("heat-needle").style.left = `${((s.temperature - 20) / 80) * 100}%`;
        text("stir-value", `${Math.round(s.stirPosition)}%`);
        $("stir-needle").style.left = `${s.stirPosition}%`;
        if (s.potion) {
          const p = s.potion;
          text("quality", `${p.quality} / 100`);
          text(
            "breakdown",
            `Bahan ${p.ingredient}/60 · Suhu ${p.heat.toFixed(1)}/20 · Adukan ${p.stir.toFixed(1)}/20`,
          );
          text(
            "reward",
            `${p.reward} koin saat diserahkan. ${p.ingredient === 0 ? "Bahan tidak sesuai pesanan." : "Racikanmu siap menemani malam."}`,
          );
        }
        if (lastOrder !== s.order.id) {
          lastOrder = s.order.id;
          text("recipe-name", s.order.name);
          $("recipe-ingredients").replaceChildren(
            ...names(s.order.ingredients).map((name) => {
              const li = document.createElement("li");
              li.textContent = name;
              return li;
            }),
          );
          text("heat-target", `${s.order.heat[0]}–${s.order.heat[1]}°`);
          text("stir-target", `${s.order.stir[0]}–${s.order.stir[1]}%`);
          band("heat-band", s.order.heat, 20, 80);
          band("stir-band", s.order.stir);
          $("liquid").setAttribute("fill", s.order.color);
          text(
            "customer-name",
            [
              "Mira, penjaga kebun",
              "Nara, penjahit malam",
              "Bima, pembawa surat",
              "Suri, pembaca bintang",
              "Lila, pemetik teh",
              "Raka, pengelana",
            ][E.RECIPES.indexOf(E.RECIPES.find((r) => r.id === s.order.id))],
          );
          text(
            "order-quote",
            s.order.id === "embun-tidur"
              ? "“Boleh sesuatu untuk tidur yang tenang?”"
              : `“Satu ${s.order.name}, untuk perjalanan pulang.”`,
          );
        }
        text("order-number", String(s.served + 1).padStart(2, "0"));
        if (lastUnlock !== s.unlockedCount) {
          lastUnlock = s.unlockedCount;
          text("unlock-count", `${s.unlockedCount} / 6 terbuka`);
          $("recipe-book").replaceChildren(
            ...E.RECIPES.map((r, i) => {
              const a = document.createElement("article");
              const h = document.createElement("h3");
              h.textContent = r.name;
              const p = document.createElement("p");
              p.textContent =
                i < s.unlockedCount
                  ? `${names(r.ingredients).join(" · ")}. Suhu ${r.heat.join("–")}°, adukan ${r.stir.join("–")}%. Harga dasar ${r.base} koin.`
                  : `Terkunci · selesai ${i - 2} giliran untuk membuka.`;
              a.append(h, p);
              return a;
            }),
          );
        }
        if (s.phase === "results") {
          text(
            "result-summary",
            `${s.coins} koin · ${s.served} pesanan · ${s.good} ramuan baik. Kualitas rata-rata ${s.averageQuality.toFixed(1)}, terbaik ${s.bestQuality}. Reputasi ${s.reputation}. Total tabungan ${profile.totalCoins} koin.`,
          );
          text(
            "result-unlock",
            profile.completedShifts <= 3
              ? `Resep baru: ${E.RECIPES[s.unlockedCount - 1].name}. Menjadi pesanan pertama giliran berikutnya.`
              : "Keenam resep sudah terbuka. Kedai selalu menantimu.",
          );
        }
      },
    };
  }
  root.Potion.View = Object.freeze({ create });
})(globalThis);

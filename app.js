(function () {
  "use strict";
  const KEY = "potion-atelier.progress.v1";
  const $ = (id) => document.getElementById(id);
  try {
    let raw = null,
      storageOK = true;
    try {
      raw = localStorage.getItem(KEY);
    } catch {
      storageOK = false;
    }
    const game = Potion.Engine.create({ profile: raw });
    const view = Potion.View.create();
    let frame = null,
      previous = null,
      persisted = false;
    function storageNote() {
      if (!storageOK)
        $("storage-note").textContent =
          "Penyimpanan tidak tersedia: kemajuan hanya untuk sesi ini. Racikan aktif tidak dipulihkan.";
    }
    function stop() {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      previous = null;
    }
    function render() {
      view.render(game.snapshot(), game.profile());
    }
    function save() {
      if (persisted) return;
      persisted = true;
      try {
        localStorage.setItem(KEY, JSON.stringify(game.profile()));
        $("result-storage").textContent = "Giliran selesai disimpan.";
      } catch {
        storageOK = false;
        // The result modal must never claim a durable save after a failed write.
        $("result-storage").textContent =
          "Penyimpanan tidak tersedia; kemajuan hanya untuk sesi ini.";
        storageNote();
        view.announce(
          "Giliran selesai. Penyimpanan tidak tersedia; kemajuan hanya di sesi ini.",
        );
      }
    }
    function tick(now) {
      frame = null;
      if (game.snapshot().phase !== "running" || document.hidden) {
        stop();
        return;
      }
      if (previous !== null) game.step((now - previous) / 1000);
      previous = now;
      render();
      if (game.snapshot().phase === "results") {
        stop();
        save();
        $("results-dialog").showModal();
        $("next").focus();
      } else frame = requestAnimationFrame(tick);
    }
    function run() {
      if (
        frame === null &&
        game.snapshot().phase === "running" &&
        !document.hidden
      ) {
        previous = null;
        frame = requestAnimationFrame(tick);
      }
    }
    function action(fn, message, focus = false) {
      const result = fn();
      render();
      view.announce(result.accepted ? message : result.reason);
      if (focus && result.accepted) $("primary").focus({ preventScroll: true });
    }
    function start() {
      if ($("results-dialog").open) $("results-dialog").close();
      const result = game.startShift();
      if (!result.accepted) return;
      persisted = false;
      render();
      view.announce(
        "Pelanggan pertama menanti. Cocokkan tiga bahan dengan resep.",
      );
      $("bench").scrollIntoView({ block: "start" });
      $("ingredients").querySelector("button").focus({ preventScroll: true });
      run();
    }
    function pause() {
      if (!game.pause().accepted) return;
      stop();
      render();
      $("pause-dialog").showModal();
      $("resume").focus();
    }
    $("start").addEventListener("click", start);
    $("next").addEventListener("click", start);
    $("pause").addEventListener("click", pause);
    $("resume").addEventListener("click", () => {
      if (document.hidden) return;
      game.resume();
      $("pause-dialog").close();
      render();
      $("primary").focus({ preventScroll: true });
      run();
    });
    $("ingredients").addEventListener("click", (event) => {
      const b = event.target.closest("button[data-ingredient]");
      if (b)
        action(
          () => game.toggleIngredient(b.dataset.ingredient),
          "Bahan diperbarui. Pilih tepat tiga bahan.",
        );
    });
    $("primary").addEventListener("click", () =>
      action(
        () => game.advance(),
        "Tahap diperbarui. Ikuti sasaran pada resep.",
        true,
      ),
    );
    $("reset").addEventListener("click", () =>
      action(
        () => game.resetBrew(),
        "Kuali bersih. Waktu giliran tetap berjalan.",
        true,
      ),
    );
    $("fire").addEventListener("input", () => {
      game.setHeat(Number($("fire").value));
      render();
    });
    $("effects").addEventListener("change", () =>
      document.body.classList.toggle("no-effects", !$("effects").checked),
    );
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      $("effects").checked = false;
      document.body.classList.add("no-effects");
    }
    // Never intercept native Space, Enter, or range arrows. Pause keys work from controls too.
    document.addEventListener("keydown", (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat)
        return;
      const typing =
        event.target.isContentEditable ||
        (event.target.tagName === "INPUT" &&
          ["text", "search", "email", "password"].includes(
            event.target.type,
          )) ||
        event.target.tagName === "TEXTAREA";
      if (
        !typing &&
        (event.key.toLowerCase() === "p" || event.key === "Escape") &&
        game.snapshot().phase === "running"
      ) {
        event.preventDefault();
        pause();
      }
    });
    for (const id of ["pause-dialog", "results-dialog"])
      $(id).addEventListener("cancel", (event) => event.preventDefault());
    window.addEventListener("blur", pause);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) pause();
    });
    render();
    storageNote();
    $("start").disabled = false;
  } catch (error) {
    $("feedback").textContent =
      "Kedai belum dapat dimulai. Muat ulang halaman dengan JavaScript aktif.";
    console.error(error);
  }
})();

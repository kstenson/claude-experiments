/* Shared history navigator for The Lab experiments.
 *
 * One small, dependency-free widget so every experiment lets you browse
 * past days the same way: ◀ prev / a date picker / next ▶, a shareable
 * #YYYY-MM-DD URL, and a clear "viewing a past day" banner.
 *
 * Usage:
 *   const nav = HistoryNav.mount({
 *     container,                 // element to render into
 *     days: [{date, label?}],    // any order; newest is treated as "latest"
 *     current,                   // optional initial date (else hash, else latest)
 *     onSelect(date, meta){},    // called on every selection (incl. initial)
 *     useHash: true,             // sync selection to location.hash
 *     label: "day",              // noun used in the banner ("day"/"issue"/"song")
 *   });
 *   nav.select("2026-05-31");    // programmatic navigation
 *   nav.current                  // currently selected date
 *
 * The component never trusts day data for HTML — only date strings and
 * textContent labels are used, so it's injection-safe.
 */
(function (global) {
  "use strict";

  function fmt(date, opts) {
    const d = new Date(date + "T00:00:00Z");
    if (isNaN(d)) return date;
    return d.toLocaleDateString("en-GB", Object.assign({ timeZone: "UTC" }, opts));
  }
  const fmtLong = (d) => fmt(d, { weekday: "short", day: "numeric", month: "short", year: "numeric" });

  function mount(cfg) {
    const container = cfg.container;
    if (!container) throw new Error("HistoryNav: container required");
    const noun = cfg.label || "day";
    const useHash = cfg.useHash !== false;

    // Normalise + sort newest-first. Keep optional per-day labels.
    const seenDates = new Set();
    const days = (cfg.days || [])
      .map((d) => (typeof d === "string" ? { date: d } : { date: d.date, label: d.label }))
      .filter((d) => d && d.date)
      .sort((a, b) => b.date.localeCompare(a.date))
      // Collapse duplicate dates (e.g. two entries sharing one day) so the picker
      // options and the prev/next index stay unambiguous — keep the first.
      .filter((d) => (seenDates.has(d.date) ? false : seenDates.add(d.date)));
    const order = days.map((d) => d.date); // newest -> oldest
    const latest = order[0];
    const metaFor = (date) => days.find((d) => d.date === date) || { date };

    // Build DOM once.
    container.classList.add("histnav");
    container.innerHTML = "";

    const prev = document.createElement("button");
    prev.type = "button";
    prev.className = "histnav-btn histnav-prev";
    prev.setAttribute("aria-label", "Older " + noun);
    prev.innerHTML = "<span aria-hidden='true'>◀</span>";

    const select = document.createElement("select");
    select.className = "histnav-select";
    select.setAttribute("aria-label", "Browse past " + noun + "s");
    days.forEach((d) => {
      const opt = document.createElement("option");
      opt.value = d.date;
      opt.textContent = fmtLong(d.date) + (d.label ? " — " + d.label : "") +
        (d.date === latest ? "  ·  latest" : "");
      select.appendChild(opt);
    });

    const next = document.createElement("button");
    next.type = "button";
    next.className = "histnav-btn histnav-next";
    next.setAttribute("aria-label", "Newer " + noun);
    next.innerHTML = "<span aria-hidden='true'>▶</span>";

    const latestBtn = document.createElement("button");
    latestBtn.type = "button";
    latestBtn.className = "histnav-btn histnav-latest";
    latestBtn.textContent = "Latest";

    const row = document.createElement("div");
    row.className = "histnav-row";
    row.append(prev, select, next, latestBtn);

    const banner = document.createElement("div");
    banner.className = "histnav-banner";
    banner.hidden = true;

    container.append(row, banner);

    let current = null;

    function update() {
      const i = order.indexOf(current);
      select.value = current;
      // newest is index 0; "prev"(older) increases index, "next"(newer) decreases.
      prev.disabled = i >= order.length - 1;
      next.disabled = i <= 0;
      const isLatest = current === latest;
      latestBtn.hidden = isLatest;
      container.classList.toggle("is-past", !isLatest);
      if (isLatest) {
        banner.hidden = true;
        banner.textContent = "";
      } else {
        banner.hidden = false;
        banner.textContent = "📅 Viewing a past " + noun + " — " + fmtLong(current) +
          ". This is the archived edition; nothing is re-scored.";
      }
    }

    function go(date, opts) {
      opts = opts || {};
      if (!order.includes(date)) date = latest;
      if (date === current && !opts.force) return;
      current = date;
      if (useHash && !opts.fromHash) {
        const h = "#" + date;
        if (global.location.hash !== h) {
          try { history.replaceState(null, "", h); }
          catch (e) { global.location.hash = date; }
        }
      }
      update();
      if (typeof cfg.onSelect === "function") cfg.onSelect(current, metaFor(current));
    }

    prev.addEventListener("click", () => {
      const i = order.indexOf(current);
      if (i < order.length - 1) go(order[i + 1]);
    });
    next.addEventListener("click", () => {
      const i = order.indexOf(current);
      if (i > 0) go(order[i - 1]);
    });
    latestBtn.addEventListener("click", () => go(latest));
    select.addEventListener("change", () => go(select.value));

    if (useHash) {
      global.addEventListener("hashchange", () => {
        const d = decodeURIComponent((global.location.hash || "").replace(/^#/, ""));
        if (order.includes(d) && d !== current) go(d, { fromHash: true });
      });
    }

    // Initial selection: explicit current > hash > latest.
    const hashDate = useHash
      ? decodeURIComponent((global.location.hash || "").replace(/^#/, ""))
      : "";
    const initial =
      (cfg.current && order.includes(cfg.current) && cfg.current) ||
      (order.includes(hashDate) && hashDate) ||
      latest;
    go(initial, { force: true, fromHash: !cfg.current && order.includes(hashDate) });

    return {
      get current() { return current; },
      select: (d) => go(d),
      days: order.slice(),
    };
  }

  global.HistoryNav = { mount, fmtLong };
})(window);

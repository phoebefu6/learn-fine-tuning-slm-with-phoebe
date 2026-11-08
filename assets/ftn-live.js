/* ftn-live.js - the break-even bench for learn-fine-tuning-slm-with-phoebe
 *
 * Part A, the eval scorer. 600 real customer messages from Banking77 (PolyAI, CC BY 4.0), each
 *   with its true queue (77 intents mapped to six queues). For three arms - a big API model with a
 *   prompt, a small model with a prompt only, and a small LoRA-tuned model - ftn-sample.js carries a
 *   predicted queue per row. Those predictions are MODELLED by a seeded, documented noise model
 *   (materials/build-ftn-sample.py), never produced by a model, and the widget says so on every
 *   number. Accuracy, macro-F1, per-queue recall and precision and the confusion matrix are
 *   COMPUTED here, for real, from labels and predictions.
 * Part B, break-even. Monthly cost of the big API model (requests x tokens x list price) against
 *   the tuned small model (GPU hours x hourly price + one-off build and training cost amortised).
 *   Prices are vendor list prices read on 2026-11-08 and must be re-verified; people costs are
 *   constructed and labelled. The verdict is GO only when the tuned model clears the accuracy floor
 *   AND is cheaper at the chosen volume.
 *   cheapest  ANTI-LEVER: "cheapest wins" ignores the floor, so it can print a GO the floor refuses.
 *   retrain   BREAK BUTTON: "retrain every month" adds a monthly training run and people time, and
 *             the break-even volume moves.
 * materials/ftn_reference.py repeats every step in Python and prints the same canon.
 */
(function (root) {
  "use strict";

  /* ---------- engine (mirrors materials/ftn_reference.py) ---------- */
  function score(y, p, k) {
    var n = y.length, cm = [], i, j, correct = 0;
    for (i = 0; i < k; i++) { cm.push([]); for (j = 0; j < k; j++) cm[i].push(0); }
    for (i = 0; i < n; i++) { cm[y[i]][p[i]] += 1; if (y[i] === p[i]) correct += 1; }
    var recall = [], precision = [], f1 = [], support = [];
    for (i = 0; i < k; i++) {
      var tp = cm[i][i], rowSum = 0, colSum = 0;
      for (j = 0; j < k; j++) { rowSum += cm[i][j]; colSum += cm[j][i]; }
      var r = rowSum ? tp / rowSum : 0, pr = colSum ? tp / colSum : 0;
      recall.push(r); precision.push(pr); support.push(rowSum);
      f1.push(r + pr > 0 ? 2 * r * pr / (r + pr) : 0);
    }
    var mf = 0; for (i = 0; i < k; i++) mf += f1[i];
    var worst = 0; for (i = 1; i < k; i++) if (recall[i] < recall[worst]) worst = i;
    return { n: n, correct: correct, accuracy: correct / n, macroF1: mf / k, recall: recall,
             precision: precision, f1: f1, support: support, confusion: cm, worst: worst };
  }

  var PRESETS = {
    "gpt-4.1": { label: "gpt-4.1 ($2.00 in / $8.00 out per 1M)", pin: 2.00, pout: 8.00 },
    "gpt-5": { label: "gpt-5 ($1.25 in / $10.00 out per 1M)", pin: 1.25, pout: 10.00 },
    "gpt-5-mini": { label: "gpt-5-mini ($0.25 in / $2.00 out per 1M)", pin: 0.25, pout: 2.00 }
  };

  var DEFAULTS = {
    preset: "gpt-4.1", volume: 900000, tin: 600, tout: 20, pin: 2.00, pout: 8.00,
    gpuHour: 0.80, hours: 730, replicas: 1,
    examples: 2000, tokPerEx: 150, epochs: 3, trainPrice: 0.34, trainMin: 4.00,
    build: 6000, amort: 12, retrainLabour: 600, retrain: false,
    floorMetric: "accuracy", floor: 0.92, mode: "floor",
    latBig: 900, latSmall: 180
  };

  function clone(o) { var c = {}; for (var k in o) c[k] = o[k]; return c; }

  /* tunedScore: the score() result for the tuned arm (floor reads it) */
  function breakEven(s, tunedScore) {
    var bigPerReq = (s.tin * s.pin + s.tout * s.pout) / 1e6;
    var bigMonthly = s.volume * bigPerReq;
    var trainCost = Math.max(s.trainMin, s.examples * s.tokPerEx * s.epochs / 1e6 * s.trainPrice);
    var hosting = s.gpuHour * s.hours * s.replicas;
    var amortised = (s.build + trainCost) / s.amort;
    var retrainMonthly = s.retrain ? trainCost + s.retrainLabour : 0;
    var smallMonthly = hosting + amortised + retrainMonthly;
    var breakEvenVolume = bigPerReq > 0 ? smallMonthly / bigPerReq : Infinity;
    var floorValue = s.floorMetric === "fraud" ? tunedScore.recall[0] : tunedScore.accuracy;
    var clearsFloor = floorValue >= s.floor - 1e-12;
    var cheaper = smallMonthly < bigMonthly;
    var go = s.mode === "cheapest" ? cheaper : (cheaper && clearsFloor);
    var refusedByFloor = s.mode === "cheapest" && cheaper && !clearsFloor;
    return {
      bigPerReq: bigPerReq, bigMonthly: bigMonthly, trainCost: trainCost, hosting: hosting,
      amortised: amortised, retrainMonthly: retrainMonthly, smallMonthly: smallMonthly,
      breakEvenVolume: breakEvenVolume, big1k: bigPerReq * 1000,
      small1k: s.volume > 0 ? smallMonthly / s.volume * 1000 : Infinity,
      floorValue: floorValue, clearsFloor: clearsFloor, cheaper: cheaper, go: go,
      refusedByFloor: refusedByFloor
    };
  }

  function armScores(sample) {
    var out = {};
    sample.arms.forEach(function (a) { out[a.id] = score(sample.y, sample.pred[a.id], sample.queues.length); });
    return out;
  }

  /* the canon, in the shape the Python reference prints */
  var SCENARIOS = [
    { id: "default", set: {} },
    { id: "retrain", set: { retrain: true } },
    { id: "fraudFloor", set: { floorMetric: "fraud" } },
    { id: "fraudFloorCheapest", set: { floorMetric: "fraud", mode: "cheapest" } },
    { id: "gpt5", set: { preset: "gpt-5", pin: 1.25, pout: 10.00 } },
    { id: "gpt5mini", set: { preset: "gpt-5-mini", pin: 0.25, pout: 2.00 } },
    { id: "lowVolume", set: { volume: 300000 } },
    { id: "highFloor", set: { floor: 0.96 } },
    { id: "highFloorCheapest", set: { floor: 0.96, mode: "cheapest" } }
  ];
  function canon(sample) {
    var sc = armScores(sample), res = { rows: sample.y.length, arms: {}, scenarios: {} };
    Object.keys(sc).forEach(function (k) {
      var s = sc[k];
      res.arms[k] = { accuracy: s.accuracy, macroF1: s.macroF1, recall: s.recall, precision: s.precision,
                      correct: s.correct, confusion: s.confusion, worst: s.worst };
    });
    res.support = sc.big.support;
    SCENARIOS.forEach(function (x) {
      var s = clone(DEFAULTS); for (var k in x.set) s[k] = x.set[k];
      var b = breakEven(s, sc.tuned);
      res.scenarios[x.id] = { bigMonthly: b.bigMonthly, smallMonthly: b.smallMonthly, trainCost: b.trainCost,
        breakEvenVolume: b.breakEvenVolume, big1k: b.big1k, small1k: b.small1k, floorValue: b.floorValue,
        clearsFloor: b.clearsFloor, cheaper: b.cheaper, go: b.go };
    });
    return res;
  }

  /* ---------- widget ---------- */
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function pct1(x) { return (x * 100).toFixed(1) + "%"; }
  function usd(x) { return "$" + Math.round(x).toLocaleString("en-US"); }
  function usd2(x) { return "$" + x.toFixed(2); }
  function vol(x) { return isFinite(x) ? Math.round(x).toLocaleString("en-US") : "never"; }

  var sample, scores, rootEl, els = {}, state = { arm: "tuned", s: clone(DEFAULTS) };

  function metric(label, val, unit, kind) {
    var cls = kind === "computed" ? "is-measured" : "is-heuristic";
    return '<div class="mb-metric"><span class="mb-mkind ' + cls + '">' + esc(kind) + '</span>' +
      '<span class="mb-mlabel">' + esc(label) + '</span><span class="mb-mvalue">' + esc(val) + '</span>' +
      '<span class="mb-munit">' + esc(unit) + '</span></div>';
  }

  function recallBars(sc, base) {
    var W = 420, rowH = 30, x0 = 150, bw = 210, y0 = 30, H = y0 + 6 * rowH + 30;
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Recall per queue for the selected arm, with the big model as a dashed tick">';
    svg += '<text class="fb-cap" x="' + x0 + '" y="18">recall: share of each queue routed right</text>';
    for (var i = 0; i < 6; i++) {
      var y = y0 + i * rowH;
      svg += '<text class="fb-lab" x="' + (x0 - 10) + '" y="' + (y + 17) + '" text-anchor="end">' + esc(sample.queues[i]) + '</text>';
      if (base) { var gx = (x0 + bw * base.recall[i]).toFixed(1); svg += '<line class="fb-ghost" x1="' + gx + '" y1="' + (y + 2) + '" x2="' + gx + '" y2="' + (y + 24) + '"/>'; }
      svg += '<rect class="fb-bar' + (i === 0 ? ' is-urgent' : '') + '" x="' + x0 + '" y="' + (y + 7) + '" width="' + (bw * sc.recall[i]).toFixed(1) + '" height="12" rx="3"/>';
      svg += '<text class="fb-val" x="' + (W - 8) + '" y="' + (y + 17) + '" text-anchor="end">' + pct1(sc.recall[i]) + '</text>';
    }
    svg += '<text class="fb-cap" x="' + x0 + '" y="' + (H - 8) + '">dashed tick = big API model + prompt</text>';
    return svg + '</svg>';
  }

  function confusion(sc) {
    var h = '<table class="dt-table fb-matrix"><thead><tr><th>true &darr; / routed &rarr;</th>';
    sample.short.forEach(function (s) { h += "<th>" + s + "</th>"; });
    h += "<th>recall</th></tr></thead><tbody>";
    for (var i = 0; i < 6; i++) {
      h += "<tr><th>" + esc(sample.queues[i]) + "</th>";
      for (var j = 0; j < 6; j++) {
        var v = sc.confusion[i][j];
        h += '<td class="' + (i === j ? "fb-diag" : (v ? "fb-miss" : "")) + '">' + v + "</td>";
      }
      h += "<td>" + pct1(sc.recall[i]) + "</td></tr>";
    }
    return h + "</tbody></table>";
  }

  function misses(armId) {
    var p = sample.pred[armId], out = [], i;
    for (i = 0; i < sample.y.length && out.length < 5; i++) {
      if (p[i] !== sample.y[i]) out.push('<li><q>' + esc(sample.text[i]) + '</q> <span class="fb-route">true: ' +
        esc(sample.queues[sample.y[i]]) + ' · routed: ' + esc(sample.queues[p[i]]) + '</span></li>');
    }
    return '<ol class="fb-misses">' + out.join("") + "</ol>";
  }

  function costChart(s, b) {
    var W = 520, H = 230, x0 = 60, x1 = 500, yTop = 20, yBot = 180;
    var vmax = Math.max(s.volume, isFinite(b.breakEvenVolume) ? b.breakEvenVolume : 0) * 1.4 || 1;
    var cmax = Math.max(vmax * b.bigPerReq, b.smallMonthly) * 1.1 || 1;
    function X(v) { return x0 + (x1 - x0) * v / vmax; }
    function Y(c) { return yBot - (yBot - yTop) * c / cmax; }
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Monthly cost against monthly requests: the big model rises in a straight line, the tuned small model is flat; they cross at the break-even volume">';
    svg += '<line class="fb-axis" x1="' + x0 + '" y1="' + yBot + '" x2="' + x1 + '" y2="' + yBot + '"/>';
    svg += '<line class="fb-axis" x1="' + x0 + '" y1="' + yTop + '" x2="' + x0 + '" y2="' + yBot + '"/>';
    svg += '<line class="fb-big" x1="' + X(0) + '" y1="' + Y(0) + '" x2="' + X(vmax) + '" y2="' + Y(vmax * b.bigPerReq).toFixed(1) + '"/>';
    svg += '<line class="fb-small" x1="' + X(0) + '" y1="' + Y(b.smallMonthly).toFixed(1) + '" x2="' + X(vmax) + '" y2="' + Y(b.smallMonthly).toFixed(1) + '"/>';
    if (isFinite(b.breakEvenVolume) && b.breakEvenVolume <= vmax) {
      var bx = X(b.breakEvenVolume);
      svg += '<circle class="fb-be" cx="' + bx.toFixed(1) + '" cy="' + Y(b.smallMonthly).toFixed(1) + '" r="5"/>';
    }
    var vx = X(s.volume);
    svg += '<line class="fb-now" x1="' + vx.toFixed(1) + '" y1="' + yTop + '" x2="' + vx.toFixed(1) + '" y2="' + yBot + '"/>';
    svg += '<text class="fb-cap" x="' + x0 + '" y="' + (yBot + 18) + '">0</text>';
    svg += '<text class="fb-cap" x="' + x1 + '" y="' + (yBot + 18) + '" text-anchor="end">' + vol(vmax) + ' requests / month</text>';
    svg += '<text class="fb-cap" x="' + (x0 - 6) + '" y="' + (yTop + 4) + '" text-anchor="end">' + usd(cmax) + '</text>';
    svg += '<text class="fb-cap" x="' + (x0 - 6) + '" y="' + yBot + '" text-anchor="end">$0</text>';
    svg += '<rect class="fb-key-big" x="' + x0 + '" y="' + (H - 20) + '" width="14" height="4"/><text class="fb-cap" x="' + (x0 + 20) + '" y="' + (H - 15) + '">big API model</text>';
    svg += '<rect class="fb-key-small" x="' + (x0 + 130) + '" y="' + (H - 20) + '" width="14" height="4"/><text class="fb-cap" x="' + (x0 + 150) + '" y="' + (H - 15) + '">tuned small model</text>';
    svg += '<rect class="fb-key-now" x="' + (x0 + 290) + '" y="' + (H - 24) + '" width="3" height="12"/><text class="fb-cap" x="' + (x0 + 300) + '" y="' + (H - 15) + '">your volume</text>';
    return svg + '</svg>';
  }

  var MODES = [
    { id: "floor", label: "Go/no-go under the floor", note: "GO only if the tuned model clears the floor AND costs less at your volume." },
    { id: "cheapest", label: "Cheapest wins", note: "Ignores the floor: whichever costs less is the answer.", anti: true }
  ];
  var ARM_NOTE = {
    big: "Modelled predictions for a large general model with Larkline's routing prompt.",
    base: "Modelled predictions for a 3-4B open model with the same prompt, no tuning.",
    tuned: "Modelled predictions for the same small model after a LoRA tune on labelled rows."
  };

  function renderA() {
    var sc = scores[state.arm], big = scores.big;
    Object.keys(els.armBtns).forEach(function (k) {
      els.armBtns[k].classList.toggle("is-on", k === state.arm);
      els.armBtns[k].querySelector("input").checked = (k === state.arm);
    });
    els.metricsA.innerHTML =
      metric("Accuracy, " + sc.n + " real rows", pct1(sc.accuracy), sc.correct + " routed correctly", "computed") +
      metric("Macro-F1, six queues", sc.macroF1.toFixed(3), "big model " + big.macroF1.toFixed(3), "computed") +
      metric("Fraud and loss recall", pct1(sc.recall[0]), "big model " + pct1(big.recall[0]), "computed") +
      metric("Weakest queue", sample.queues[sc.worst], "recall " + pct1(sc.recall[sc.worst]), "computed");
    els.bars.innerHTML = recallBars(sc, state.arm === "big" ? null : big);
    els.matrix.innerHTML = confusion(sc);
    els.misses.innerHTML = misses(state.arm);
    renderB();
  }

  function renderB() {
    var s = state.s, b = breakEven(s, scores.tuned);
    Object.keys(els.modeBtns).forEach(function (k) {
      els.modeBtns[k].classList.toggle("is-on", k === s.mode);
      els.modeBtns[k].querySelector("input").checked = (k === s.mode);
    });
    var floorName = s.floorMetric === "fraud" ? "fraud and loss recall" : "accuracy";
    var v, cls;
    if (s.mode === "cheapest") {
      v = (b.cheaper ? "GO (cheapest wins). " : "NO-GO (cheapest wins). ") + "Tuned small " + usd(b.smallMonthly) + " a month against " + usd(b.bigMonthly) + ".";
      if (b.refusedByFloor) v += " The floor would refuse this: tuned " + floorName + " " + pct1(b.floorValue) + " is under " + pct1(s.floor) + ".";
      cls = b.refusedByFloor ? "is-bad" : (b.cheaper ? "is-good" : "is-ok");
    } else if (b.go) {
      v = "GO. The tuned model clears the floor (" + floorName + " " + pct1(b.floorValue) + " against " + pct1(s.floor) + ") and costs " + usd(b.smallMonthly) + " a month against " + usd(b.bigMonthly) + ".";
      cls = "is-good";
    } else {
      var why = [];
      if (!b.clearsFloor) why.push("tuned " + floorName + " " + pct1(b.floorValue) + " is under the " + pct1(s.floor) + " floor");
      if (!b.cheaper) why.push("at " + vol(s.volume) + " requests the big model is cheaper (" + usd(b.bigMonthly) + " against " + usd(b.smallMonthly) + ")");
      v = "NO-GO: " + why.join("; ") + ".";
      cls = "is-ok";
    }
    els.verdict.className = "mb-verdict " + cls;
    els.verdict.textContent = v;
    els.metricsB.innerHTML =
      metric("Big API model, per month", usd(b.bigMonthly), usd2(b.big1k) + " per 1,000 requests", "list price") +
      metric("Tuned small model, per month", usd(b.smallMonthly), usd2(b.small1k) + " per 1,000 requests", "list price + constructed") +
      metric("Break-even volume", vol(b.breakEvenVolume), "requests a month; your volume " + vol(s.volume), "computed") +
      metric("One training run", usd2(b.trainCost), (s.retrain ? "plus " + usd(s.retrainLabour) + " people time, every month" : "amortised over " + s.amort + " months"), "list price") +
      metric("Tuned " + floorName, pct1(b.floorValue), "floor " + pct1(s.floor) + (b.clearsFloor ? ", cleared" : ", not cleared"), "modelled predictions") +
      metric("p50 latency, big / small", s.latBig + " / " + s.latSmall + " ms", "your vendor-reported inputs", "input");
    els.chart.innerHTML = costChart(s, b);
    els.retrain.checked = !!s.retrain;
    els.retrainLab.classList.toggle("is-on", !!s.retrain);
  }

  var FIELDS = [
    ["volume", "Requests a month", 1000], ["tin", "Input tokens per request (big)", 10], ["tout", "Output tokens per request", 1],
    ["pin", "Big model $ per 1M input", 0.01], ["pout", "Big model $ per 1M output", 0.01],
    ["gpuHour", "GPU $ per hour (small)", 0.01], ["hours", "GPU hours a month", 1], ["replicas", "GPU replicas", 1],
    ["examples", "Training examples", 50], ["tokPerEx", "Tokens per example", 10], ["epochs", "Epochs", 1],
    ["trainPrice", "Training $ per 1M tokens", 0.01], ["build", "One-off build cost $ (constructed)", 100],
    ["amort", "Amortise over months", 1], ["retrainLabour", "Retrain people cost $ a month (constructed)", 50],
    ["latBig", "p50 latency big, ms (vendor-reported)", 10], ["latSmall", "p50 latency small, ms (vendor-reported)", 10]
  ];

  function syncInputs() {
    FIELDS.forEach(function (f) { var el = document.getElementById("fb-in-" + f[0]); if (el) el.value = state.s[f[0]]; });
    els.preset.value = state.s.preset in PRESETS ? state.s.preset : "custom";
    els.floor.value = Math.round(state.s.floor * 100);
    els.floorOut.textContent = Math.round(state.s.floor * 100) + "%";
    els.floorMetric.value = state.s.floorMetric;
  }

  function radio(name, items, onPick, wrapCls) {
    var panel = document.createElement("div"); panel.className = "mb-presets " + (wrapCls || "");
    var btns = {};
    items.forEach(function (p) {
      var l = document.createElement("label");
      l.className = "mb-preset" + (p.anti ? " is-anti" : "");
      l.innerHTML = '<input type="radio" name="' + name + '" value="' + p.id + '">' +
        '<span class="mb-pname">' + esc(p.label) + (p.anti ? ' <em class="mb-anti">anti-lever</em>' : "") + "</span>" +
        '<span class="mb-pnote">' + esc(p.note) + "</span>";
      l.querySelector("input").addEventListener("change", function () { onPick(p.id); });
      panel.appendChild(l); btns[p.id] = l;
    });
    return { panel: panel, btns: btns };
  }

  function buildUI() {
    rootEl.innerHTML = "";
    var hA = document.createElement("h4"); hA.className = "fb-h"; hA.textContent = "Part A · the eval scorer";
    rootEl.appendChild(hA);
    var a = radio("fb-arm", sample.arms.map(function (x) { return { id: x.id, label: x.label, note: ARM_NOTE[x.id] }; }),
      function (id) { state.arm = id; renderA(); });
    els.armBtns = a.btns; rootEl.appendChild(a.panel);
    els.metricsA = document.createElement("div"); els.metricsA.className = "mb-metrics"; rootEl.appendChild(els.metricsA);
    var grid = document.createElement("div"); grid.className = "fb-grid";
    var c1 = document.createElement("div"); c1.className = "fb-card";
    c1.innerHTML = '<h5>Recall by queue <span class="mb-mkind is-heuristic">modelled predictions</span></h5>';
    els.bars = document.createElement("div"); els.bars.className = "fb-stage"; c1.appendChild(els.bars);
    var c2 = document.createElement("div"); c2.className = "fb-card";
    c2.innerHTML = "<h5>First five misroutes in the 600 (real text)</h5>";
    els.misses = document.createElement("div"); c2.appendChild(els.misses);
    grid.appendChild(c1); grid.appendChild(c2); rootEl.appendChild(grid);
    var c3 = document.createElement("div"); c3.className = "fb-card";
    c3.innerHTML = "<h5>Confusion matrix: where each queue's rows were routed</h5>";
    els.matrix = document.createElement("div"); els.matrix.className = "dt-tablewrap"; c3.appendChild(els.matrix);
    rootEl.appendChild(c3);

    var hB = document.createElement("h4"); hB.className = "fb-h"; hB.textContent = "Part B · break-even and the go/no-go";
    rootEl.appendChild(hB);
    var m = radio("fb-mode", MODES, function (id) { state.s.mode = id; renderB(); });
    els.modeBtns = m.btns; rootEl.appendChild(m.panel);

    var ctl = document.createElement("div"); ctl.className = "fb-controls";
    var pr = '<label class="fb-field fb-wide"><span>Big model list price</span><select id="fb-preset">';
    Object.keys(PRESETS).forEach(function (k) { pr += '<option value="' + k + '">' + esc(PRESETS[k].label) + "</option>"; });
    pr += '<option value="custom">custom (edit the two prices)</option></select></label>';
    pr += '<label class="fb-field"><span>Floor applies to</span><select id="fb-floormetric"><option value="accuracy">accuracy</option><option value="fraud">fraud and loss recall</option></select></label>';
    pr += '<label class="fb-field"><span>Floor <output id="fb-floorout">92%</output></span><input type="range" id="fb-floor" min="80" max="99" step="1" value="92"></label>';
    ctl.innerHTML = pr;
    rootEl.appendChild(ctl);

    var brk = document.createElement("label"); brk.className = "mb-preset is-anti fb-retrain";
    brk.innerHTML = '<input type="checkbox" id="fb-retrain"><span class="mb-pname">Retrain every month <em class="mb-anti">break</em></span>' +
      '<span class="mb-pnote">Adds one training run and the people time to relabel, evaluate and redeploy, every month.</span>';
    rootEl.appendChild(brk);
    els.retrain = brk.querySelector("input"); els.retrainLab = brk;
    els.retrain.addEventListener("change", function () { state.s.retrain = els.retrain.checked; renderB(); });

    els.verdict = document.createElement("p"); rootEl.appendChild(els.verdict);
    els.metricsB = document.createElement("div"); els.metricsB.className = "mb-metrics"; rootEl.appendChild(els.metricsB);
    var c4 = document.createElement("div"); c4.className = "fb-card";
    c4.innerHTML = "<h5>Monthly cost against volume; the dot is break-even</h5>";
    els.chart = document.createElement("div"); els.chart.className = "fb-stage"; c4.appendChild(els.chart);
    rootEl.appendChild(c4);

    var det = document.createElement("details"); det.className = "fb-inputs";
    var inner = '<summary>All inputs (edit any number)</summary><div class="fb-fields">';
    FIELDS.forEach(function (f) {
      inner += '<label class="fb-field"><span>' + esc(f[1]) + '</span><input type="number" min="0" step="' + f[2] + '" id="fb-in-' + f[0] + '"></label>';
    });
    det.innerHTML = inner + "</div>";
    rootEl.appendChild(det);

    var hint = document.createElement("p"); hint.className = "mb-hint";
    hint.textContent = "Real rows: " + sample.y.length + " customer messages from the Banking77 test split (PolyAI, CC BY 4.0; Casanueva et al. 2020), " +
      "sampled with a fixed seed; 77 intents mapped to six queues; text unchanged. They stand in for Larkline's claim notes, which are constructed. " +
      "Predictions are modelled by a seeded noise model, not produced by any model; every metric is computed from them here. " +
      "Prices: OpenAI API list prices, Hugging Face Inference Endpoints (1 x NVIDIA L4, $0.80 an hour) and Together AI supervised fine-tuning ($0.34 per 1M tokens, $4.00 minimum), read 2026-11-08; re-verify before you rely on them. " +
      "Build, retrain people cost and latency defaults are constructed placeholders.";
    rootEl.appendChild(hint);

    els.preset = document.getElementById("fb-preset");
    els.floor = document.getElementById("fb-floor");
    els.floorOut = document.getElementById("fb-floorout");
    els.floorMetric = document.getElementById("fb-floormetric");
    els.preset.addEventListener("change", function () {
      var k = els.preset.value; state.s.preset = k;
      if (PRESETS[k]) { state.s.pin = PRESETS[k].pin; state.s.pout = PRESETS[k].pout; }
      syncInputs(); renderB();
    });
    els.floor.addEventListener("input", function () { state.s.floor = (+els.floor.value) / 100; els.floorOut.textContent = els.floor.value + "%"; renderB(); });
    els.floorMetric.addEventListener("change", function () { state.s.floorMetric = els.floorMetric.value; renderB(); });
    FIELDS.forEach(function (f) {
      document.getElementById("fb-in-" + f[0]).addEventListener("input", function (e) {
        var x = parseFloat(e.target.value);
        if (!isNaN(x) && x >= 0) {
          state.s[f[0]] = x;
          if (f[0] === "pin" || f[0] === "pout") { state.s.preset = "custom"; els.preset.value = "custom"; }
          renderB();
        }
      });
    });
    syncInputs();
    renderA();
  }

  function init() {
    rootEl = document.getElementById("ftn-bench");
    if (!rootEl || !root.FTN_SAMPLE) return;
    sample = root.FTN_SAMPLE;
    scores = armScores(sample);
    var defArm = rootEl.getAttribute("data-arm");
    if (defArm !== null && scores[defArm]) state.arm = defArm;
    buildUI();
    root.FTN_LIVE = {
      set: function (o) {
        if (o.arm) state.arm = o.arm;
        for (var k in o) if (k !== "arm") state.s[k] = o[k];
        if (o.preset && PRESETS[o.preset] && o.pin === undefined) { state.s.pin = PRESETS[o.preset].pin; state.s.pout = PRESETS[o.preset].pout; }
        syncInputs(); renderA();
        return breakEven(state.s, scores.tuned);
      },
      reset: function () { state.s = clone(DEFAULTS); state.arm = "tuned"; syncInputs(); renderA(); },
      state: state, scores: scores,
      verdictText: function () { return els.verdict.textContent; }
    };
  }

  var api = { score: score, breakEven: breakEven, armScores: armScores, canon: canon, DEFAULTS: DEFAULTS,
              PRESETS: PRESETS, SCENARIOS: SCENARIOS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();
  }
})(typeof window !== "undefined" ? window : this);

/* کارنما — نمونه؛ داده‌ها فقط روی همین دستگاه */
(() => {
  "use strict";

  const STORAGE_KEY = "karnama.tasks.v1";
  const SEEDED_KEY = "karnama.seeded.v1";

  // ─── Jalali helpers (jalaali algorithm; verified 1405/08/01 ↔ 2026-10-23) ───
  function div(a, b) { return ~~(a / b); }
  function mod(a, b) { return a - ~~(a / b) * b; }

  function jalCal(jy) {
    const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210,
      1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
    const bl = breaks.length;
    const gy = jy + 621;
    let leapJ = -14;
    let jp = breaks[0];
    let jump = 0;
    if (jy < jp || jy >= breaks[bl - 1]) throw new Error("Jalali year out of range");
    for (let i = 1; i < bl; i++) {
      const jm = breaks[i];
      jump = jm - jp;
      if (jy < jm) break;
      leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
      jp = jm;
    }
    let n = jy - jp;
    leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
    if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
    const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
    const march = 20 + leapJ - leapG;
    if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
    let leap = mod(mod(n + 1, 33) - 1, 4);
    if (leap === -1) leap = 4;
    return { leap, gy, march };
  }

  function j2d(jy, jm, jd) {
    const r = jalCal(jy);
    return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
  }

  function d2j(jdn) {
    const g = d2g(jdn);
    let jy = g.gy - 621;
    const r = jalCal(jy);
    const jdn1f = g2d(g.gy, 3, r.march);
    let k = jdn - jdn1f;
    let jm, jd;
    if (k >= 0) {
      if (k <= 185) {
        jm = 1 + div(k, 31);
        jd = mod(k, 31) + 1;
        return { jy, jm, jd };
      }
      k -= 186;
    } else {
      jy -= 1;
      k += 179;
      if (r.leap === 1) k += 1;
    }
    jm = 7 + div(k, 30);
    jd = mod(k, 30) + 1;
    return { jy, jm, jd };
  }

  function g2d(gy, gm, gd) {
    let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4)
      + div(153 * mod(gm + 9, 12) + 2, 5)
      + gd - 34840408;
    d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
    return d;
  }

  function d2g(jdn) {
    let j = 4 * jdn + 139361631;
    j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
    const i = div(mod(j, 1461), 4) * 5 + 308;
    const gd = div(mod(i, 153), 5) + 1;
    const gm = mod(div(i, 153), 12) + 1;
    const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
    return { gy, gm, gd };
  }

  function jalaliToGregorian(jy, jm, jd) {
    return d2g(j2d(jy, jm, jd));
  }
  function gregorianToJalali(gy, gm, gd) {
    return d2j(g2d(gy, gm, gd));
  }

  // Self-check known anchor (throws if build is wrong)
  (function verifyJalali() {
    const g = jalaliToGregorian(1405, 8, 1);
    if (g.gy !== 2026 || g.gm !== 10 || g.gd !== 23) {
      console.error("Jalali verify failed", g);
    }
    const j = gregorianToJalali(2026, 10, 23);
    if (j.jy !== 1405 || j.jm !== 8 || j.jd !== 1) {
      console.error("Gregorian→Jalali verify failed", j);
    }
  })();

  const J_MONTHS = ["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"];
  const J_DOW = ["ش","ی","د","س","چ","پ","ج"]; // شنبه…جمعه display order Sat-first

  function toFaDigits(str) {
    return String(str).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
  }

  function pad2(n) { return n < 10 ? "0" + n : String(n); }

  function todayParts() {
    const now = new Date();
    // Use local calendar day in Asia/Tehran-ish: device local is fine for personal use;
    // also cross-check via persian Intl for display.
    return gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }

  function formatJalaliDisplay(jy, jm, jd, opts = {}) {
    try {
      const g = jalaliToGregorian(jy, jm, jd);
      const dt = new Date(g.gy, g.gm - 1, g.gd, 12);
      return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
        weekday: opts.weekday ? "long" : undefined,
        year: "numeric",
        month: opts.shortMonth ? "short" : "long",
        day: "numeric",
      }).format(dt);
    } catch {
      return toFaDigits(`${jy}/${pad2(jm)}/${pad2(jd)}`);
    }
  }

  function jalaliKey(jy, jm, jd) {
    return `${jy}-${pad2(jm)}-${pad2(jd)}`;
  }

  function parseJalaliKey(key) {
    if (!key) return null;
    const [jy, jm, jd] = key.split("-").map(Number);
    return { jy, jm, jd };
  }

  function daysInJalaliMonth(jy, jm) {
    if (jm <= 6) return 31;
    if (jm <= 11) return 30;
    return jalCal(jy).leap === 0 ? 29 : 30;
  }

  // ─── Storage ───
  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }
  function saveTasks(tasks) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }

  function uid() {
    return "t_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  function seedIfNeeded() {
    if (localStorage.getItem(SEEDED_KEY)) return;
    const t = todayParts();
    const tomorrow = (() => {
      const g = jalaliToGregorian(t.jy, t.jm, t.jd);
      const d = new Date(g.gy, g.gm - 1, g.gd);
      d.setDate(d.getDate() + 1);
      return gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    })();
    const nextWeek = (() => {
      const g = jalaliToGregorian(t.jy, t.jm, t.jd);
      const d = new Date(g.gy, g.gm - 1, g.gd);
      d.setDate(d.getDate() + 5);
      return gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    })();
    const yesterday = (() => {
      const g = jalaliToGregorian(t.jy, t.jm, t.jd);
      const d = new Date(g.gy, g.gm - 1, g.gd);
      d.setDate(d.getDate() - 1);
      return gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    })();

    const samples = [
      { title: "نمونه — تماس با دفتر", note: "پیگیری پرونده نمونه", date: null, time: null },
      { title: "نمونه — خرید لوازم", note: "", date: null, time: null },
      { title: "نمونه — جلسه امروز", note: "ساعت ۱۰", date: jalaliKey(t.jy, t.jm, t.jd), time: "10:00" },
      { title: "نمونه — یادآوری گذشته", note: "برای تست بنر یادآوری", date: jalaliKey(t.jy, t.jm, t.jd), time: "07:00" },
      { title: "نمونه — کار عقب‌افتاده", note: "", date: jalaliKey(yesterday.jy, yesterday.jm, yesterday.jd), time: null },
      { title: "نمونه — فردا", note: "", date: jalaliKey(tomorrow.jy, tomorrow.jm, tomorrow.jd), time: "09:30" },
      { title: "نمونه — هفته آینده", note: "بدون عجله", date: jalaliKey(nextWeek.jy, nextWeek.jm, nextWeek.jd), time: null },
    ].map((s) => ({
      id: uid(),
      title: s.title,
      note: s.note,
      date: s.date,
      time: s.time,
      done: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      remindAck: false,
    }));
    saveTasks(samples);
    localStorage.setItem(SEEDED_KEY, "1");
  }

  // ─── State ───
  let tasks = [];
  let view = "today"; // inbox | today | upcoming
  let editingId = null;
  let pickerYM = null; // {jy, jm} for sheet picker

  // ─── DOM ───
  const $ = (sel, el = document) => el.querySelector(sel);

  function reminderDue(task) {
    if (task.done || !task.date || !task.time || task.remindAck) return false;
    const p = parseJalaliKey(task.date);
    if (!p) return false;
    const g = jalaliToGregorian(p.jy, p.jm, p.jd);
    const [hh, mm] = task.time.split(":").map(Number);
    const when = new Date(g.gy, g.gm - 1, g.gd, hh, mm, 0, 0);
    return Date.now() >= when.getTime();
  }

  function isOverdue(task) {
    if (task.done || !task.date) return false;
    const t = todayParts();
    const p = parseJalaliKey(task.date);
    if (!p) return false;
    const a = j2d(p.jy, p.jm, p.jd);
    const b = j2d(t.jy, t.jm, t.jd);
    return a < b;
  }

  function isToday(task) {
    if (!task.date) return false;
    const t = todayParts();
    return task.date === jalaliKey(t.jy, t.jm, t.jd);
  }

  function compareTasks(a, b) {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.date && b.date && a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.time && b.time && a.time !== b.time) return a.time < b.time ? -1 : 1;
    if (!!a.time !== !!b.time) return a.time ? -1 : 1;
    return (b.createdAt || 0) - (a.createdAt || 0);
  }

  function tasksForView() {
    if (view === "inbox") {
      return tasks.filter((t) => !t.date && !t.done).sort(compareTasks)
        .concat(tasks.filter((t) => !t.date && t.done).sort(compareTasks));
    }
    if (view === "today") {
      const overdue = tasks.filter((t) => isOverdue(t)).sort(compareTasks);
      const today = tasks.filter((t) => isToday(t)).sort(compareTasks);
      return { overdue, today };
    }
    // upcoming: has date and date >= today (including today) OR future; group by date
    const t = todayParts();
    const todayKey = jalaliKey(t.jy, t.jm, t.jd);
    const upcoming = tasks
      .filter((x) => x.date && x.date >= todayKey)
      .sort(compareTasks);
    const groups = new Map();
    for (const task of upcoming) {
      if (!groups.has(task.date)) groups.set(task.date, []);
      groups.get(task.date).push(task);
    }
    return groups;
  }

  function viewTitle() {
    if (view === "inbox") return "صندوق ورودی";
    if (view === "today") return "امروز";
    return "آینده";
  }

  function viewSubtitle() {
    const t = todayParts();
    return formatJalaliDisplay(t.jy, t.jm, t.jd, { weekday: true });
  }

  function renderTask(task) {
    const overdue = isOverdue(task);
    const dueRemind = reminderDue(task);
    let chips = "";
    if (task.date) {
      const p = parseJalaliKey(task.date);
      const label = formatJalaliDisplay(p.jy, p.jm, p.jd, { shortMonth: true });
      chips += `<span class="chip ${overdue ? "overdue" : ""}">${label}</span>`;
    }
    if (task.time) {
      chips += `<span class="chip time">${toFaDigits(task.time)}</span>`;
    }
    if (dueRemind) {
      chips += `<span class="chip remind">یادآوری</span>`;
    }
    return `
      <article class="task ${task.done ? "done" : ""} ${overdue ? "overdue-task" : ""}" data-id="${task.id}">
        <button type="button" class="check" data-act="toggle" aria-label="انجام شد"></button>
        <div class="task-body" data-act="edit">
          <div class="title">${escapeHtml(task.title)}</div>
          ${task.note ? `<div class="note">${escapeHtml(task.note)}</div>` : ""}
          ${chips ? `<div class="meta">${chips}</div>` : ""}
        </div>
        <div class="task-actions">
          <button type="button" data-act="edit" aria-label="ویرایش">✎</button>
          <button type="button" data-act="delete" aria-label="حذف">⌫</button>
        </div>
      </article>`;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function render() {
    $("#viewTitle").textContent = viewTitle();
    $("#viewSub").textContent = viewSubtitle();

    // banner
    const due = tasks.filter(reminderDue);
    const banner = $("#remindBanner");
    if (due.length) {
      banner.classList.add("show");
      $("#remindText").innerHTML = `<strong>${toFaDigits(due.length)} یادآوری رسیده:</strong> ${due.slice(0, 3).map((t) => escapeHtml(t.title)).join(" · ")}`;
    } else {
      banner.classList.remove("show");
    }

    // badges
    const inboxCount = tasks.filter((t) => !t.date && !t.done).length;
    const todayCount = tasks.filter((t) => !t.done && (isToday(t) || isOverdue(t))).length;
    setBadge("tab-inbox", inboxCount);
    setBadge("tab-today", todayCount);

    document.querySelectorAll(".tab").forEach((el) => {
      el.classList.toggle("active", el.dataset.view === view);
    });

    const main = $("#main");
    if (view === "today") {
      const { overdue, today } = tasksForView();
      let html = "";
      if (overdue.length) {
        html += `<div class="section-label overdue">عقب‌افتاده</div><div class="task-list">${overdue.map(renderTask).join("")}</div>`;
      }
      html += `<div class="section-label">امروز</div>`;
      if (today.length) html += `<div class="task-list">${today.map(renderTask).join("")}</div>`;
      else html += `<div class="empty">برای امروز کاری ثبت نشده — نمونه‌ها را ببینید یا سریع اضافه کنید.</div>`;
      main.innerHTML = html;
    } else if (view === "inbox") {
      const list = tasksForView();
      if (!list.length) main.innerHTML = `<div class="empty">صندوق ورودی خالی است. کار بدون تاریخ اینجا می‌آید.</div>`;
      else main.innerHTML = `<div class="task-list">${list.map(renderTask).join("")}</div>`;
    } else {
      const groups = tasksForView();
      if (!groups.size) {
        main.innerHTML = `<div class="empty">کار آینده‌ای نیست.</div>`;
      } else {
        let html = "";
        for (const [key, list] of groups) {
          const p = parseJalaliKey(key);
          html += `<div class="section-label">${formatJalaliDisplay(p.jy, p.jm, p.jd, { weekday: true })}</div>`;
          html += `<div class="task-list">${list.map(renderTask).join("")}</div>`;
        }
        main.innerHTML = html;
      }
    }
  }

  function setBadge(id, n) {
    const el = document.getElementById(id);
    let b = el.querySelector(".badge");
    if (n > 0) {
      if (!b) {
        b = document.createElement("span");
        b.className = "badge";
        el.appendChild(b);
      }
      b.textContent = toFaDigits(n);
    } else if (b) b.remove();
  }

  // ─── Sheet / form ───
  function openSheet(task) {
    editingId = task ? task.id : null;
    $("#sheetTitle").textContent = task ? "ویرایش کار" : "کار جدید";
    $("#fTitle").value = task ? task.title : "";
    $("#fNote").value = task ? (task.note || "") : "";
    $("#fTime").value = task && task.time ? task.time : "";
    const t = todayParts();
    if (task && task.date) {
      const p = parseJalaliKey(task.date);
      pickerYM = { jy: p.jy, jm: p.jm };
      $("#fDateKey").value = task.date;
    } else {
      pickerYM = { jy: t.jy, jm: t.jm };
      $("#fDateKey").value = "";
    }
    $("#btnDelete").style.display = task ? "inline-flex" : "none";
    renderPicker();
    $("#overlay").classList.add("show");
    setTimeout(() => $("#fTitle").focus(), 200);
  }

  function closeSheet() {
    $("#overlay").classList.remove("show");
    editingId = null;
  }

  function renderPicker() {
    if (!pickerYM) return;
    const { jy, jm } = pickerYM;
    const selected = $("#fDateKey").value;
    const today = todayParts();
    const dim = daysInJalaliMonth(jy, jm);
    // weekday of 1st: JS Sun=0 … — Jalali week starts Saturday
    const g1 = jalaliToGregorian(jy, jm, 1);
    const dt = new Date(g1.gy, g1.gm - 1, g1.gd);
    const jsDow = dt.getDay(); // 0 Sun … 6 Sat
    const start = (jsDow + 1) % 7; // convert so Sat=0

    $("#jpMonthLabel").textContent = toFaDigits(`${J_MONTHS[jm - 1]} ${jy}`);
    let cells = "";
    for (let i = 0; i < start; i++) cells += `<button type="button" class="muted" tabindex="-1" disabled></button>`;
    for (let d = 1; d <= dim; d++) {
      const key = jalaliKey(jy, jm, d);
      const cls = [
        key === selected ? "selected" : "",
        d === today.jd && jm === today.jm && jy === today.jy ? "today" : "",
      ].filter(Boolean).join(" ");
      cells += `<button type="button" data-day="${d}" class="${cls}">${toFaDigits(d)}</button>`;
    }
    $("#jdays").innerHTML = cells;
  }

  function persistFromSheet() {
    const title = $("#fTitle").value.trim();
    if (!title) {
      $("#fTitle").focus();
      return;
    }
    const note = $("#fNote").value.trim();
    const date = $("#fDateKey").value || null;
    const time = $("#fTime").value || null;
    if (editingId) {
      tasks = tasks.map((t) =>
        t.id === editingId
          ? { ...t, title, note, date, time, updatedAt: Date.now(), remindAck: false }
          : t
      );
    } else {
      tasks.unshift({
        id: uid(),
        title,
        note,
        date,
        time,
        done: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        remindAck: false,
      });
    }
    saveTasks(tasks);
    closeSheet();
    render();
  }

  function quickAdd() {
    const input = $("#quickInput");
    const title = input.value.trim();
    if (!title) return;
    const date =
      view === "today"
        ? jalaliKey(todayParts().jy, todayParts().jm, todayParts().jd)
        : null;
    tasks.unshift({
      id: uid(),
      title,
      note: "",
      date,
      time: null,
      done: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      remindAck: false,
    });
    saveTasks(tasks);
    input.value = "";
    render();
  }

  // ─── Events ───
  function bind() {
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        view = tab.dataset.view;
        render();
      });
    });
    $("#quickBtn").addEventListener("click", quickAdd);
    $("#quickInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") quickAdd();
    });
    $("#fab").addEventListener("click", () => openSheet(null));
    $("#btnCancel").addEventListener("click", closeSheet);
    $("#btnSave").addEventListener("click", persistFromSheet);
    $("#btnDelete").addEventListener("click", () => {
      if (!editingId) return;
      if (!confirm("این کار حذف شود؟")) return;
      tasks = tasks.filter((t) => t.id !== editingId);
      saveTasks(tasks);
      closeSheet();
      render();
    });
    $("#overlay").addEventListener("click", (e) => {
      if (e.target.id === "overlay") closeSheet();
    });
    $("#remindDismiss").addEventListener("click", () => {
      tasks = tasks.map((t) => (reminderDue(t) ? { ...t, remindAck: true } : t));
      saveTasks(tasks);
      render();
    });
    $("#jpPrev").addEventListener("click", () => {
      let { jy, jm } = pickerYM;
      jm -= 1;
      if (jm < 1) { jm = 12; jy -= 1; }
      pickerYM = { jy, jm };
      renderPicker();
    });
    $("#jpNext").addEventListener("click", () => {
      let { jy, jm } = pickerYM;
      jm += 1;
      if (jm > 12) { jm = 1; jy += 1; }
      pickerYM = { jy, jm };
      renderPicker();
    });
    $("#jdays").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-day]");
      if (!btn) return;
      const d = Number(btn.dataset.day);
      $("#fDateKey").value = jalaliKey(pickerYM.jy, pickerYM.jm, d);
      renderPicker();
    });
    $("#jpClear").addEventListener("click", () => {
      $("#fDateKey").value = "";
      renderPicker();
    });

    $("#main").addEventListener("click", (e) => {
      const art = e.target.closest(".task");
      if (!art) return;
      const id = art.dataset.id;
      const act = e.target.closest("[data-act]")?.dataset.act;
      const task = tasks.find((t) => t.id === id);
      if (!task || !act) return;
      if (act === "toggle") {
        tasks = tasks.map((t) =>
          t.id === id ? { ...t, done: !t.done, updatedAt: Date.now() } : t
        );
        saveTasks(tasks);
        render();
      } else if (act === "edit") {
        openSheet(task);
      } else if (act === "delete") {
        if (!confirm("حذف شود؟")) return;
        tasks = tasks.filter((t) => t.id !== id);
        saveTasks(tasks);
        render();
      }
    });
  }

  function registerSW() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("./service-worker.js").catch((err) => {
      console.warn("SW register failed", err);
    });
  }

  // expose for tests
  window.__karnama = { jalaliToGregorian, gregorianToJalali, todayParts, formatJalaliDisplay };

  function init() {
    seedIfNeeded();
    tasks = loadTasks();
    bind();
    render();
    registerSW();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else init();
})();

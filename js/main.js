const nav = document.querySelector(".nav");
const toggle = document.querySelector(".nav-toggle");
const links = document.querySelector("#nav-links");
const year = document.querySelector("[data-year]");
const statusEls = document.querySelectorAll("[data-status], [data-status-lg]");
const clockEl = document.querySelector("[data-clock]");
const clockDay = document.querySelector("[data-clock-day]");
const progress = document.querySelector("[data-progress]");
const result = document.querySelector("[data-need-result]");
const toTop = document.querySelector(".to-top");
const copied = document.querySelector("[data-copied]");

const daysSk = {
  Mon: "Pondelok",
  Tue: "Utorok",
  Wed: "Streda",
  Thu: "Štvrtok",
  Fri: "Piatok",
  Sat: "Sobota",
  Sun: "Nedeľa",
};

if (year) year.textContent = String(new Date().getFullYear());

toggle?.addEventListener("click", () => {
  const open = nav.classList.toggle("is-open");
  toggle.setAttribute("aria-expanded", String(open));
});

links?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("is-open");
    toggle?.setAttribute("aria-expanded", "false");
  });
});

function bratislavaParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Bratislava",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const pick = (type) => parts.find((part) => part.type === type)?.value;
  const weekday = pick("weekday");
  const hour = Number(pick("hour"));
  const minute = Number(pick("minute"));
  const second = Number(pick("second"));
  return { weekday, hour, minute, second, minutes: hour * 60 + minute };
}

function openingWindow(weekday) {
  if (weekday === "Sun") return null;
  if (weekday === "Sat") return { start: 8 * 60, end: 12 * 60, label: "12:00", key: "sat" };
  return { start: 8 * 60, end: 17 * 60, label: "17:00", key: "week" };
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function updateClock() {
  const { weekday, hour, minute, second, minutes } = bratislavaParts();
  const win = openingWindow(weekday);
  const open = Boolean(win && minutes >= win.start && minutes < win.end);
  const text = open ? `Teraz otvorené · do ${win.label}` : "Teraz zatvorené";

  if (clockEl) clockEl.textContent = `${pad(hour)}:${pad(minute)}:${pad(second)}`;
  if (clockDay) clockDay.textContent = daysSk[weekday] || weekday;
  statusEls.forEach((el) => {
    el.classList.toggle("is-open", open);
    el.classList.toggle("is-closed", !open);
    const slot = el.querySelector("[data-status-text]");
    if (slot) slot.textContent = text;
    else el.textContent = text;
  });

  document.querySelectorAll(".hours-table li").forEach((row) => row.classList.remove("is-today"));
  const key = weekday === "Sun" ? "sun" : weekday === "Sat" ? "sat" : "week";
  document.querySelector(`[data-day="${key}"]`)?.classList.add("is-today");
}

updateClock();
setInterval(updateClock, 1000);

document.querySelectorAll(".need-card").forEach((card) => {
  card.addEventListener("click", () => {
    document.querySelectorAll(".need-card").forEach((item) => item.classList.remove("is-on"));
    card.classList.add("is-on");
    if (!result) return;
    result.hidden = false;
    result.querySelector("[data-need-title]").textContent = card.querySelector("strong").textContent;
    result.querySelector("[data-need-say]").textContent = card.dataset.say;
    result.scrollIntoView({ behavior: "smooth", block: "nearest" });
    const bookKind = card.closest(".need-group")?.querySelector("h3")?.textContent.includes("Pneuservis")
      ? "pneuservis"
      : "umyvaren";
    document.querySelector(`[data-book-service="${bookKind}"]`)?.click();
  });
});

document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", async (event) => {
    const value = event.currentTarget.dataset.copy;
    try {
      await navigator.clipboard.writeText(value);
      if (copied) {
        copied.hidden = false;
        setTimeout(() => {
          copied.hidden = true;
        }, 2200);
      }
    } catch {
      window.location.href = `tel:${value}`;
    }
  });
});

const spyLinks = [...document.querySelectorAll("[data-spy]")];
const spySections = spyLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

const spy = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      spyLinks.forEach((link) => {
        link.classList.toggle("is-active", link.getAttribute("href") === `#${entry.target.id}`);
      });
    });
  },
  { rootMargin: "-45% 0px -50% 0px" }
);
spySections.forEach((section) => spy.observe(section));

window.addEventListener(
  "scroll",
  () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const value = max > 0 ? (scrollY / max) * 100 : 0;
    if (progress) progress.style.width = `${value}%`;
    toTop?.classList.toggle("is-on", scrollY > 420);
  },
  { passive: true }
);

toTop?.addEventListener("click", (event) => {
  event.preventDefault();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

if (matchMedia("(pointer: fine)").matches) {
  document.querySelectorAll(".btn-magnet").forEach((btn) => {
    btn.addEventListener("pointermove", (event) => {
      const box = btn.getBoundingClientRect();
      const x = event.clientX - box.left - box.width / 2;
      const y = event.clientY - box.top - box.height / 2;
      btn.style.transform = `translate(${x * 0.18}px, ${y * 0.22}px)`;
    });
    btn.addEventListener("pointerleave", () => {
      btn.style.transform = "";
    });
  });

  document.querySelectorAll(".need-card").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const box = card.getBoundingClientRect();
      const rx = ((event.clientY - box.top) / box.height - 0.5) * -8;
      const ry = ((event.clientX - box.left) / box.width - 0.5) * 8;
      card.style.transform = `translateY(-8px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    });
    card.addEventListener("pointerleave", () => {
      card.style.transform = "";
    });
  });
}

const bookDaysEl = document.querySelector("[data-book-days]");
const bookSlotsEl = document.querySelector("[data-book-slots]");
const bookChoice = document.querySelector("[data-book-choice]");
const bookHint = document.querySelector("[data-book-hint]");
const bookSend = document.querySelector("[data-book-send]");
const bookState = { service: "pneuservis", dateKey: "", time: "", carType: "" };

const serviceLabel = {
  pneuservis: "Pneuservis",
  umyvaren: "Ručná autoumyváreň",
};

const carTypeLabel = {
  osobne: "Osobné vozidlo",
  suv: "SUV",
  dodavka: "Dodávka",
};

function bratislavaYmd(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bratislava",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function weekdayFromKey(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dow];
}

function mondayPad(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();
  return (dow + 6) % 7;
}

function lastDateOfMonth(y, m) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function dateKeyFromParts(y, m, d) {
  return `${y}-${pad(m)}-${pad(d)}`;
}

function shiftMonth(y, m, delta) {
  const shifted = new Date(Date.UTC(y, m - 1 + delta, 1));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1 };
}

function monthIndex(y, m) {
  return y * 12 + m;
}

function slotsForDay(dateKey) {
  if (!dateKey) return [];
  const win = openingWindow(weekdayFromKey(dateKey));
  if (!win) return [];
  const now = bratislavaParts();
  const today = bratislavaYmd();
  const slots = [];
  for (let minutes = win.start; minutes + 30 <= win.end; minutes += 30) {
    const past = dateKey === today && minutes <= now.minutes;
    const lunch = bookState.service === "pneuservis" && minutes === 12 * 60;
    slots.push({
      label: `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`,
      past,
      blocked: lunch,
      reason: lunch ? "Obedňajšia prestávka 12:00 – 12:30" : "",
    });
  }
  return slots;
}

function isDaySelectable(dateKey) {
  const today = bratislavaYmd();
  if (dateKey < today) return false;
  if (weekdayFromKey(dateKey) === "Sun") return false;
  return slotsForDay(dateKey).some((slot) => !slot.past && !slot.blocked);
}

function formatChoice() {
  if (!bookState.dateKey || !bookState.time) return "";
  const weekday = daysSk[weekdayFromKey(bookState.dateKey)] || "";
  const [y, month, day] = bookState.dateKey.split("-");
  const [hour, minute] = bookState.time.split(":").map(Number);
  const endMin = hour * 60 + minute + 30;
  return `${serviceLabel[bookState.service]} · ${weekday} ${Number(day)}. ${Number(month)}. ${y} · ${bookState.time} – ${pad(Math.floor(endMin / 60))}:${pad(endMin % 60)}`;
}

function bookContact() {
  const name = document.querySelector("[data-book-name]")?.value.trim() || "";
  const email = document.querySelector("[data-book-email]")?.value.trim() || "";
  const phone = document.querySelector("[data-book-phone]")?.value.trim() || "";
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const phoneOk = phone.replace(/[^\d+]/g, "").length >= 9;
  return { name, email, phone, ok: Boolean(name && emailOk && phoneOk) };
}

function bookVehicle() {
  const brand = document.querySelector("[data-book-brand]")?.value.trim() || "";
  const typeOk = bookState.service !== "umyvaren" || Boolean(bookState.carType);
  return { brand, type: bookState.carType, ok: Boolean(brand && typeOk) };
}

function syncVehicleFields() {
  const wrap = document.querySelector("[data-book-type-wrap]");
  if (wrap) wrap.hidden = bookState.service !== "umyvaren";
}

function updateBookSummary() {
  if (!bookChoice || !bookSend) return;
  const contact = bookContact();
  const vehicle = bookVehicle();
  const ready = Boolean(bookState.dateKey && bookState.time && contact.ok && vehicle.ok);
  bookSend.disabled = !ready;
  if (ready) {
    const text = formatChoice();
    bookChoice.textContent = text;
    if (bookHint) bookHint.textContent = "Odošlite dopyt na WhatsApp — termín potvrdíme.";
    const message = [
      "Dobrý deň, chcel by som sa objednať.",
      text,
      `Meno: ${contact.name}`,
      `E-mail: ${contact.email}`,
      `Telefón: ${contact.phone}`,
      `Značka auta: ${vehicle.brand}`,
      bookState.service === "umyvaren" ? `Typ: ${carTypeLabel[vehicle.type]}` : "",
    ]
      .filter(Boolean)
      .join(" ");
    bookSend.dataset.href = `https://wa.me/421918762732?text=${encodeURIComponent(message)}`;
  } else {
    bookChoice.textContent = "Vyplňte kontakt, vozidlo, deň a čas.";
    if (bookHint) bookHint.textContent = "Potom odošlite dopyt na WhatsApp — termín potvrdíme.";
    bookSend.dataset.href = "https://wa.me/421918762732";
  }
}

function renderSlots() {
  if (!bookSlotsEl) return;
  bookSlotsEl.innerHTML = "";
  const breakNote = document.querySelector("[data-book-break]");
  if (breakNote) breakNote.hidden = bookState.service !== "pneuservis";
  if (!bookState.dateKey) {
    const hint = document.createElement("p");
    hint.className = "book-slots-hint";
    hint.textContent = "Vyberte deň v kalendári.";
    bookSlotsEl.append(hint);
    updateBookSummary();
    return;
  }
  const slots = slotsForDay(bookState.dateKey);
  const available = slots.filter((slot) => !slot.past && !slot.blocked);
  if (bookState.time && !available.some((slot) => slot.label === bookState.time)) {
    bookState.time = "";
  }
  slots.forEach((slot) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "book-slot";
    btn.textContent = slot.label;
    btn.disabled = slot.past || slot.blocked;
    btn.classList.toggle("is-break", Boolean(slot.blocked));
    btn.classList.toggle("is-on", slot.label === bookState.time);
    if (slot.reason) btn.title = slot.reason;
    btn.addEventListener("click", () => {
      if (slot.blocked) return;
      bookState.time = slot.label;
      renderSlots();
      updateBookSummary();
    });
    bookSlotsEl.append(btn);
  });
  updateBookSummary();
}

const monthsSk = [
  "Január",
  "Február",
  "Marec",
  "Apríl",
  "Máj",
  "Jún",
  "Júl",
  "August",
  "September",
  "Október",
  "November",
  "December",
];
const weekdaysShortSk = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"];
const todayParts = bratislavaYmd().split("-").map(Number);
const bookCalView = { year: todayParts[0], month: todayParts[1] };
const maxCalMonth = shiftMonth(todayParts[0], todayParts[1], 3);

function selectDay(dateKey) {
  bookState.dateKey = dateKey;
  bookState.time = "";
  renderDays();
  renderSlots();
}

function appendCalDay(grid, { key, label, outside }) {
  const today = bratislavaYmd();
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "book-cal-day";
  btn.textContent = String(label);
  btn.dataset.date = key;
  const selectable = !outside && isDaySelectable(key);
  btn.disabled = !selectable;
  btn.classList.toggle("is-outside", Boolean(outside));
  btn.classList.toggle("is-today", key === today);
  btn.classList.toggle("is-on", key === bookState.dateKey);
  btn.setAttribute("aria-label", key);
  btn.setAttribute("aria-pressed", String(key === bookState.dateKey));
  if (selectable) btn.addEventListener("click", () => selectDay(key));
  grid.append(btn);
}

function renderDays() {
  if (!bookDaysEl) return;
  const minMonth = monthIndex(todayParts[0], todayParts[1]);
  const maxMonth = monthIndex(maxCalMonth.year, maxCalMonth.month);
  const viewMonth = monthIndex(bookCalView.year, bookCalView.month);
  const lastDay = lastDateOfMonth(bookCalView.year, bookCalView.month);
  const firstKey = dateKeyFromParts(bookCalView.year, bookCalView.month, 1);
  const padCount = mondayPad(firstKey);
  const prev = shiftMonth(bookCalView.year, bookCalView.month, -1);
  const prevLast = lastDateOfMonth(prev.year, prev.month);

  bookDaysEl.innerHTML = "";

  const nav = document.createElement("div");
  nav.className = "book-cal-nav";

  const prevBtn = document.createElement("button");
  prevBtn.type = "button";
  prevBtn.className = "book-cal-shift";
  prevBtn.setAttribute("aria-label", "Predchádzajúci mesiac");
  prevBtn.textContent = "‹";
  prevBtn.disabled = viewMonth <= minMonth;
  prevBtn.addEventListener("click", () => {
    const nextView = shiftMonth(bookCalView.year, bookCalView.month, -1);
    bookCalView.year = nextView.year;
    bookCalView.month = nextView.month;
    renderDays();
  });

  const title = document.createElement("strong");
  title.textContent = `${monthsSk[bookCalView.month - 1]} ${bookCalView.year}`;

  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.className = "book-cal-shift";
  nextBtn.setAttribute("aria-label", "Ďalší mesiac");
  nextBtn.textContent = "›";
  nextBtn.disabled = viewMonth >= maxMonth;
  nextBtn.addEventListener("click", () => {
    const nextView = shiftMonth(bookCalView.year, bookCalView.month, 1);
    bookCalView.year = nextView.year;
    bookCalView.month = nextView.month;
    renderDays();
  });

  nav.append(prevBtn, title, nextBtn);

  const grid = document.createElement("div");
  grid.className = "book-cal-grid";
  grid.setAttribute("role", "grid");

  weekdaysShortSk.forEach((label) => {
    const cell = document.createElement("div");
    cell.className = "book-cal-dow";
    cell.textContent = label;
    grid.append(cell);
  });

  for (let i = 0; i < padCount; i += 1) {
    const day = prevLast - padCount + 1 + i;
    appendCalDay(grid, {
      key: dateKeyFromParts(prev.year, prev.month, day),
      label: day,
      outside: true,
    });
  }

  for (let day = 1; day <= lastDay; day += 1) {
    appendCalDay(grid, {
      key: dateKeyFromParts(bookCalView.year, bookCalView.month, day),
      label: day,
      outside: false,
    });
  }

  const filled = padCount + lastDay;
  const tail = (7 - (filled % 7)) % 7;
  const nextMonth = shiftMonth(bookCalView.year, bookCalView.month, 1);
  for (let day = 1; day <= tail; day += 1) {
    appendCalDay(grid, {
      key: dateKeyFromParts(nextMonth.year, nextMonth.month, day),
      label: day,
      outside: true,
    });
  }

  const choice = document.createElement("p");
  choice.className = "book-cal-choice";
  if (bookState.dateKey) {
    const weekday = daysSk[weekdayFromKey(bookState.dateKey)] || "";
    const [, month, day] = bookState.dateKey.split("-");
    choice.textContent = `Vybraný deň: ${weekday} ${Number(day)}. ${Number(month)}.`;
  } else {
    choice.textContent = "Kliknite na deň — nedeľa je zatvorená.";
  }

  bookDaysEl.append(nav, grid, choice);
}

document.querySelectorAll("[data-book-service]").forEach((btn) => {
  btn.addEventListener("click", () => {
    bookState.service = btn.dataset.bookService;
    document.querySelectorAll("[data-book-service]").forEach((item) => {
      const on = item === btn;
      item.classList.toggle("is-on", on);
      item.setAttribute("aria-selected", String(on));
    });
    syncVehicleFields();
    renderSlots();
    updateBookSummary();
  });
});

if (bookDaysEl && bookSlotsEl) {
  renderDays();
  renderSlots();
}
syncVehicleFields();

document.querySelectorAll("[data-book-name], [data-book-email], [data-book-phone], [data-book-brand]").forEach((input) => {
  input.addEventListener("input", updateBookSummary);
});

document.querySelectorAll("[data-book-car-type]").forEach((btn) => {
  btn.addEventListener("click", () => {
    bookState.carType = btn.dataset.bookCarType;
    document.querySelectorAll("[data-book-car-type]").forEach((item) => {
      item.classList.toggle("is-on", item === btn);
    });
    updateBookSummary();
  });
});

bookSend?.addEventListener("click", () => {
  if (bookSend.disabled) return;
  const href = bookSend.dataset.href;
  if (href) window.open(href, "_blank", "noopener");
});

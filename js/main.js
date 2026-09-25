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
const bookForm = document.querySelector(".book");
const bookSendButtons = document.querySelectorAll("[data-book-send]");
const bookShopMail = "info@jtpneu.sk";
const bookConfirmUrls = ["https://form.jtpneu.sk/send.php", "http://form.jtpneu.sk/send.php"];
const bookState = { service: "pneuservis", dateKey: "", time: "", carType: "" };
let bookTaken = {};
const bookTouched = {
  name: false,
  email: false,
  phone: false,
  brand: false,
  type: false,
  day: false,
  time: false,
};

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

const washSlotMinutes = {
  week: [8 * 60, 9 * 60 + 30, 11 * 60, 12 * 60 + 30, 14 * 60, 15 * 60],
  sat: [8 * 60, 9 * 60 + 30, 11 * 60],
};

function slotMinutesForDay(dateKey) {
  const win = openingWindow(weekdayFromKey(dateKey));
  if (!win) return [];
  if (bookState.service === "umyvaren") return washSlotMinutes[win.key] || [];
  const minutes = [];
  for (let start = win.start; start + 30 <= win.end; start += 30) minutes.push(start);
  return minutes;
}

function slotsForDay(dateKey) {
  if (!dateKey) return [];
  const now = bratislavaParts();
  const today = bratislavaYmd();
  const takenTimes = bookTaken[dateKey] || [];
  return slotMinutesForDay(dateKey).map((minutes) => {
    const label = `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
    const lunch = bookState.service === "pneuservis" && minutes === 12 * 60;
    const taken = takenTimes.includes(label);
    return {
      label,
      past: dateKey === today && minutes <= now.minutes,
      lunch,
      taken,
      blocked: lunch || taken,
      reason: lunch ? "Obedňajšia prestávka 12:00 – 12:30" : taken ? "Obsadené" : "",
    };
  });
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
  const start = `${bookState.time}`;
  if (bookState.service === "umyvaren") {
    return `${serviceLabel[bookState.service]} · ${weekday} ${Number(day)}. ${Number(month)}. ${y} · ${start}`;
  }
  const endMin = hour * 60 + minute + 30;
  return `${serviceLabel[bookState.service]} · ${weekday} ${Number(day)}. ${Number(month)}. ${y} · ${start} – ${pad(Math.floor(endMin / 60))}:${pad(endMin % 60)}`;
}

function bookContact() {
  const name = document.querySelector("[data-book-name]")?.value.trim() || "";
  const email = document.querySelector("[data-book-email]")?.value.trim() || "";
  const phone = document.querySelector("[data-book-phone]")?.value.trim() || "";
  return { name, email, phone };
}

function bookVehicle() {
  const brand = document.querySelector("[data-book-brand]")?.value.trim() || "";
  return { brand, type: bookState.carType };
}

function emailLooksOk(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function phoneLooksOk(phone) {
  return phone.replace(/\D/g, "").length >= 9;
}

function bookFieldErrors() {
  const contact = bookContact();
  const vehicle = bookVehicle();
  const errors = {};
  if (!contact.name) errors.name = "Meno chýba. Napíšte ho, napr. Ján Novák.";
  else if (contact.name.length < 2) errors.name = "Meno je príliš krátke. Napíšte celé meno, napr. Ján Novák.";
  if (!contact.email) errors.email = "E-mail chýba. Má vyzerať ako meno@firma.sk.";
  else if (!emailLooksOk(contact.email)) errors.email = "E-mail nie je v správnom tvare. Použite formát meno@firma.sk.";
  if (!contact.phone) errors.phone = "Telefón chýba. Zadajte číslo, napr. 0918 123 456.";
  else if (!phoneLooksOk(contact.phone)) errors.phone = "Telefón nie je v správnom tvare. Zadajte aspoň 9 číslic, napr. 0918 123 456.";
  if (!vehicle.brand) errors.brand = "Značka auta chýba. Napíšte ju, napr. Škoda Octavia.";
  if (bookState.service === "umyvaren" && !vehicle.type) {
    errors.type = "Vyberte typ vozidla: osobné, SUV alebo dodávka.";
  }
  if (!bookState.dateKey) errors.day = "Deň chýba. Kliknite na deň v kalendári.";
  if (!bookState.time) errors.time = "Čas chýba. Vyberte voľný termín.";
  return { contact, vehicle, errors, ok: Object.keys(errors).length === 0 };
}

function paintBookErrors() {
  const { errors } = bookFieldErrors();
  ["name", "email", "phone", "brand", "type", "day", "time"].forEach((key) => {
    const el = document.querySelector(`[data-book-error="${key}"]`);
    if (!el) return;
    const message = bookTouched[key] ? errors[key] || "" : "";
    el.hidden = !message;
    el.textContent = message;
    const wrap = el.closest(".book-field, .book-block");
    wrap?.classList.toggle("is-invalid", Boolean(message));
  });
  const nameInput = document.querySelector("[data-book-name]");
  const emailInput = document.querySelector("[data-book-email]");
  const phoneInput = document.querySelector("[data-book-phone]");
  const brandInput = document.querySelector("[data-book-brand]");
  [
    [nameInput, "name"],
    [emailInput, "email"],
    [phoneInput, "phone"],
    [brandInput, "brand"],
  ].forEach(([input, key]) => {
    if (!input) return;
    const invalid = Boolean(bookTouched[key] && errors[key]);
    input.classList.toggle("is-invalid", invalid);
    input.setAttribute("aria-invalid", String(invalid));
  });
}

function bookingMessage() {
  const { contact, vehicle } = bookFieldErrors();
  const text = formatChoice();
  return [
    "Dobrý deň, chcel by som sa objednať.",
    text,
    `Meno: ${contact.name}`,
    `E-mail: ${contact.email}`,
    `Telefón: ${contact.phone}`,
    `Značka auta: ${vehicle.brand}`,
    bookState.service === "umyvaren" ? `Typ: ${carTypeLabel[vehicle.type]}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function syncVehicleFields() {
  const wrap = document.querySelector("[data-book-type-wrap]");
  if (wrap) wrap.hidden = bookState.service !== "umyvaren";
  const timeLabel = document.querySelector("[data-book-time-label]");
  if (timeLabel) {
    timeLabel.textContent = bookState.service === "umyvaren" ? "Čas" : "Čas · 30 minút";
  }
}

function updateBookSummary() {
  if (!bookChoice) return;
  paintBookErrors();
  const { ok } = bookFieldErrors();
  const tried = Object.values(bookTouched).some(Boolean);
  if (ok) {
    bookChoice.textContent = formatChoice();
    if (bookHint) bookHint.textContent = "Odošlite rezerváciu cez WhatsApp alebo e-mail. Termín sa hneď obsadí.";
  } else if (tried && Object.values(bookTouched).filter(Boolean).length >= 2) {
    bookChoice.textContent = "Skontrolujte červené polia.";
    if (bookHint) bookHint.textContent = "Doplňte chýbajúce údaje v správnom tvare, potom odošlite rezerváciu.";
  } else {
    bookChoice.textContent = "Vyplňte kontakt, vozidlo, deň a čas.";
    if (bookHint) bookHint.textContent = "Potom odošlite rezerváciu cez WhatsApp alebo e-mail. Termín sa hneď obsadí.";
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
    btn.classList.toggle("is-break", Boolean(slot.lunch));
    btn.classList.toggle("is-taken", Boolean(slot.taken));
    btn.classList.toggle("is-on", slot.label === bookState.time);
    if (slot.reason) btn.title = slot.reason;
    btn.addEventListener("click", () => {
      if (slot.blocked) return;
      bookState.time = slot.label;
      bookTouched.time = true;
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
  bookTouched.day = true;
  bookTouched.time = false;
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
    if (bookState.dateKey && !isDaySelectable(bookState.dateKey)) {
      bookState.dateKey = "";
      bookState.time = "";
    }
    renderDays();
    renderSlots();
    updateBookSummary();
  });
});

if (bookDaysEl && bookSlotsEl) {
  renderDays();
  renderSlots();
  loadTaken();
  setInterval(loadTaken, 30000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) loadTaken();
  });
}
syncVehicleFields();

document.querySelectorAll("[data-book-name], [data-book-email], [data-book-phone], [data-book-brand]").forEach((input) => {
  const key = input.hasAttribute("data-book-name")
    ? "name"
    : input.hasAttribute("data-book-email")
      ? "email"
      : input.hasAttribute("data-book-phone")
        ? "phone"
        : "brand";
  input.addEventListener("input", () => {
    if (bookTouched[key]) updateBookSummary();
  });
  input.addEventListener("blur", () => {
    bookTouched[key] = true;
    updateBookSummary();
  });
});

document.querySelectorAll("[data-book-car-type]").forEach((btn) => {
  btn.addEventListener("click", () => {
    bookState.carType = btn.dataset.bookCarType;
    bookTouched.type = true;
    document.querySelectorAll("[data-book-car-type]").forEach((item) => {
      item.classList.toggle("is-on", item === btn);
    });
    updateBookSummary();
  });
});

function revealAllBookErrors() {
  Object.keys(bookTouched).forEach((key) => {
    bookTouched[key] = true;
  });
  if (bookState.service !== "umyvaren") bookTouched.type = false;
  updateBookSummary();
}

function setBookStatus(title, hint) {
  if (bookChoice) bookChoice.textContent = title;
  if (bookHint) bookHint.textContent = hint;
}

function applyTaken(taken) {
  if (!taken || typeof taken !== "object") return;
  bookTaken = taken;
  renderDays();
  renderSlots();
}

function fetchBookApi(path, options) {
  const urls = bookConfirmUrls.map((url) => `${url}${path}`);
  return fetch(urls[0], options)
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));
      data.status = res.status;
      if (!res.ok && res.status !== 409) throw new Error("request failed");
      return data;
    })
    .catch(() =>
      fetch(urls[1], options).then(async (res) => {
        const data = await res.json().catch(() => ({}));
        data.status = res.status;
        if (!res.ok && res.status !== 409) throw new Error("request failed");
        return data;
      })
    );
}

function loadTaken() {
  return fetchBookApi("?action=taken")
    .then((data) => {
      if (data.taken) applyTaken(data.taken);
    })
    .catch(() => {});
}

function sendBookingRequest(channel) {
  const emailBtn = document.querySelector('[data-book-send="email"]');
  const waBtn = document.querySelector('[data-book-send="whatsapp"]');
  if (emailBtn) emailBtn.disabled = true;
  if (waBtn) waBtn.disabled = true;
  setBookStatus("Odosielam rezerváciu…", "Termín sa hneď obsadí. Súhrn príde na váš e-mail.");

  const { contact, vehicle } = bookFieldErrors();
  const message = bookingMessage();
  const payload = {
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
    brand: vehicle.brand,
    type: vehicle.type,
    service: bookState.service,
    dateKey: bookState.dateKey,
    time: bookState.time,
    website: "",
  };

  fetchBookApi("", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  })
    .then((data) => {
      if (data.taken) applyTaken(data.taken);
      if (data.error === "taken" || data.status === 409) {
        bookState.time = "";
        bookTouched.time = true;
        renderSlots();
        setBookStatus("Tento čas už je obsadený.", "Vyberte iný voľný termín a odošlite znova.");
        return;
      }
      if (data.ok === false) {
        throw new Error("book failed");
      }
      if (channel === "whatsapp") {
        window.open(`https://wa.me/421918762732?text=${encodeURIComponent(message)}`, "_blank", "noopener");
      }
      setBookStatus(
        "Termín je rezervovaný.",
        "Čas sme obsadili. Na váš e-mail sme poslali súhrn s odkazom na zrušenie."
      );
    })
    .catch(() => {
      setBookStatus("Rezerváciu sa nepodarilo odoslať.", "Skúste to znova, alebo zavolajte na 0918 762 732.");
    })
    .finally(() => {
      if (emailBtn) emailBtn.disabled = false;
      if (waBtn) waBtn.disabled = false;
    });
}

function sendBooking(channel) {
  revealAllBookErrors();
  const { ok } = bookFieldErrors();
  if (!ok) {
    document.querySelector(".book-error:not([hidden])")?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  sendBookingRequest(channel);
}

bookSendButtons.forEach((btn) => {
  btn.addEventListener("click", () => sendBooking(btn.dataset.bookSend));
});

bookForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  sendBooking("whatsapp");
});

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

document.querySelector("[data-copy]")?.addEventListener("click", async (event) => {
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
const bookSummary = document.querySelector("[data-book-summary]");
const bookChoice = document.querySelector("[data-book-choice]");
const bookWa = document.querySelector("[data-book-wa]");
const bookState = { service: "pneuservis", dateKey: "", time: "" };

const serviceLabel = {
  pneuservis: "Pneuservis",
  umyvaren: "Ručná autoumyváreň",
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
  const [year, month, day] = dateKey.split("-").map(Number);
  const noon = new Date(Date.UTC(year, month - 1, day, 11, 0, 0));
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short" }).format(noon);
}

function openDays(count = 12) {
  const [year, month, day] = bratislavaYmd().split("-").map(Number);
  const start = Date.UTC(year, month - 1, day);
  const days = [];
  for (let i = 0; i < 21 && days.length < count; i += 1) {
    const key = bratislavaYmd(new Date(start + i * 86400000));
    if (weekdayFromKey(key) !== "Sun") days.push(key);
  }
  return days;
}

function slotsForDay(dateKey) {
  const win = openingWindow(weekdayFromKey(dateKey));
  if (!win) return [];
  const now = bratislavaParts();
  const today = bratislavaYmd();
  const slots = [];
  for (let minutes = win.start; minutes + 30 <= win.end; minutes += 30) {
    const past = dateKey === today && minutes <= now.minutes;
    slots.push({
      label: `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`,
      past,
    });
  }
  return slots;
}

function formatDayButton(dateKey) {
  const weekday = weekdayFromKey(dateKey);
  const [, month, day] = dateKey.split("-");
  return { weekday: daysSk[weekday] || weekday, date: `${Number(day)}. ${Number(month)}.` };
}

function formatChoice() {
  if (!bookState.dateKey || !bookState.time) return "";
  const weekday = daysSk[weekdayFromKey(bookState.dateKey)] || "";
  const [, month, day] = bookState.dateKey.split("-");
  const [hour, minute] = bookState.time.split(":").map(Number);
  const endMin = hour * 60 + minute + 30;
  return `${serviceLabel[bookState.service]} · ${weekday} ${Number(day)}. ${Number(month)}. · ${bookState.time} – ${pad(Math.floor(endMin / 60))}:${pad(endMin % 60)}`;
}

function bookContact() {
  const name = document.querySelector("[data-book-name]")?.value.trim() || "";
  const email = document.querySelector("[data-book-email]")?.value.trim() || "";
  const phone = document.querySelector("[data-book-phone]")?.value.trim() || "";
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const phoneOk = phone.replace(/[^\d+]/g, "").length >= 9;
  return { name, email, phone, ok: Boolean(name && emailOk && phoneOk) };
}

function updateBookSummary() {
  if (!bookSummary || !bookChoice || !bookWa) return;
  const contact = bookContact();
  const ready = Boolean(bookState.dateKey && bookState.time && contact.ok);
  bookSummary.hidden = !ready;
  if (!ready) return;
  const text = formatChoice();
  bookChoice.textContent = text;
  const message = [
    "Dobrý deň, chcel by som sa objednať.",
    text,
    `Meno: ${contact.name}`,
    `E-mail: ${contact.email}`,
    `Telefón: ${contact.phone}`,
  ].join(" ");
  bookWa.href = `https://wa.me/421918762732?text=${encodeURIComponent(message)}`;
}

function renderSlots() {
  if (!bookSlotsEl) return;
  bookSlotsEl.innerHTML = "";
  const slots = slotsForDay(bookState.dateKey);
  const available = slots.filter((slot) => !slot.past);
  if (bookState.time && !available.some((slot) => slot.label === bookState.time)) {
    bookState.time = available[0]?.label || "";
  }
  slots.forEach((slot) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "book-slot";
    btn.textContent = slot.label;
    btn.disabled = slot.past;
    btn.classList.toggle("is-on", slot.label === bookState.time);
    btn.addEventListener("click", () => {
      bookState.time = slot.label;
      renderSlots();
      updateBookSummary();
    });
    bookSlotsEl.append(btn);
  });
  updateBookSummary();
}

function renderDays() {
  if (!bookDaysEl) return;
  const days = openDays();
  if (!bookState.dateKey) {
    const firstOpen = days.find((key) => slotsForDay(key).some((slot) => !slot.past)) || days[0];
    bookState.dateKey = firstOpen;
  }
  bookDaysEl.innerHTML = "";
  days.forEach((key) => {
    const meta = formatDayButton(key);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "book-day";
    btn.innerHTML = `<small>${meta.weekday.slice(0, 2)}</small><strong>${meta.date}</strong>`;
    btn.classList.toggle("is-on", key === bookState.dateKey);
    btn.addEventListener("click", () => {
      bookState.dateKey = key;
      bookState.time = "";
      renderDays();
      renderSlots();
    });
    bookDaysEl.append(btn);
  });
}

document.querySelectorAll("[data-book-service]").forEach((btn) => {
  btn.addEventListener("click", () => {
    bookState.service = btn.dataset.bookService;
    document.querySelectorAll("[data-book-service]").forEach((item) => {
      const on = item === btn;
      item.classList.toggle("is-on", on);
      item.setAttribute("aria-selected", String(on));
    });
    updateBookSummary();
  });
});

if (bookDaysEl && bookSlotsEl) {
  renderDays();
  renderSlots();
}

document.querySelectorAll("[data-book-name], [data-book-email], [data-book-phone]").forEach((input) => {
  input.addEventListener("input", updateBookSummary);
});

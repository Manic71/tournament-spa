export function parseMinutes(timeStr = "09:00") {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

export function formatMinutes(total) {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

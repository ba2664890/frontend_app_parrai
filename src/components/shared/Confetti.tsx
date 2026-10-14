
// Confettis aux couleurs du Sénégal — vert, jaune, rouge
import { useCallback } from "react";

const COLORS = ["#1F7A3A", "#FFD800", "#C62F24"];

export function spawnConfetti(count = 45) {
  if (typeof document === "undefined") return;
  for (let i = 0; i < count; i++) {
    setTimeout(createPiece, i * 35);
  }
}

function createPiece() {
  const colors = COLORS;
  const el = document.createElement("div");
  el.className = "pointer-events-none fixed z-[100] rounded-[2px]";
  el.style.width = Math.random() * 12 + 6 + "px";
  el.style.height = Math.random() * 8 + 4 + "px";
  el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
  el.style.left = Math.random() * 100 + "vw";
  el.style.top = "-20px";
  el.style.opacity = "1";
  el.style.transform = `rotate(${Math.random() * 360}deg)`;
  el.style.transition = `top ${2 + Math.random() * 2.2}s cubic-bezier(0.25,0.46,0.45,0.94), transform 3s ease-out, opacity 2.5s ease-out`;
  document.body.appendChild(el);
  requestAnimationFrame(() => {
    el.style.top = "105vh";
    el.style.transform = `rotate(${Math.random() * 1080}deg) scale(0.6)`;
    el.style.opacity = "0";
  });
  setTimeout(() => el.parentNode && el.parentNode.removeChild(el), 4200);
}

// Conteneur de confettis relatif (pour révélation dans une carte)
export function spawnConfettiIn(container: HTMLElement, count = 40) {
  for (let i = 0; i < count; i++) {
    const colors = COLORS;
    const bit = document.createElement("div");
    const size = Math.random() * 12 + 6;
    bit.style.position = "absolute";
    bit.style.width = size + "px";
    bit.style.height = size * 0.6 + "px";
    bit.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    bit.style.left = Math.random() * 100 + "%";
    bit.style.top = "-20px";
    bit.style.borderRadius = "2px";
    bit.style.opacity = String(Math.random() * 0.5 + 0.5);
    bit.style.transform = `rotate(${Math.random() * 360}deg)`;
    bit.style.transition = `all ${1.5 + Math.random() * 1.5}s cubic-bezier(0.25,0.46,0.45,0.94)`;
    container.appendChild(bit);
    setTimeout(() => {
      bit.style.top = "105%";
      bit.style.transform = `rotate(${Math.random() * 720}deg) translateX(${(Math.random() - 0.5) * 120}px)`;
      bit.style.opacity = "0";
    }, 50);
    setTimeout(() => bit.remove(), 3200);
  }
}

// Hook utilitaire
export function useConfetti() {
  return useCallback(() => spawnConfetti(50), []);
}

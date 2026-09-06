/**
 * Renders every carousel image for a day into ~/Downloads/carrossel-preview,
 * without touching Instagram or the database — for eyeballing a layout
 * change against real fixtures before any of it goes near the account.
 *
 *   npx tsx scripts/carousel-preview.ts            # hoje
 *   DIA=2026-09-08 npx tsx scripts/carousel-preview.ts
 */
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { slugify, type MatchView } from "@ondevaipassar/shared";
import { renderCarouselImages } from "../src/instagram/renderCarousel.js";
import { groupIntoPosts } from "../src/instagram/poster.js";

const OUT = `${process.env.HOME}/Downloads/carrossel-preview`;
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// Midnight BRT to midnight BRT, same window the digest uses.
const dia = process.env.DIA ?? new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
const fim = new Date(`${dia}T03:00:00Z`);
fim.setUTCDate(fim.getUTCDate() + 1);
const r = await fetch(
  `https://api.ondevaipassar.com/api/matches?from=${dia}T03:00:00Z&to=${fim.toISOString()}`,
);
const todos = (await r.json()) as MatchView[];
const grupos = groupIntoPosts(todos.filter((m) => m.broadcasts.length > 0));

let total = 0;
for (const [i, g] of grupos.entries()) {
  const imgs = await renderCarouselImages(g.competitionId, g.competitionName, g.matches);
  const base = `${String(i + 1).padStart(2, "0")}-${slugify(g.competitionName)}`;
  imgs.forEach((buf, j) => {
    const nome = j === 0 ? `${base}-capa.png` : `${base}-slide${j}.png`;
    writeFileSync(`${OUT}/${nome}`, buf);
    total++;
  });
  console.log(`${g.competitionName}: ${g.matches.length} jogos -> ${imgs.length} imagens`);
}
console.log(`\n${total} imagens em ${OUT}`);

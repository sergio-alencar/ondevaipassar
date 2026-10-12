# assets-src: material de origem das imagens

Esta pasta **não vai para o ar**. O site só entrega o que está em
`frontend/public/images/`; aqui ficam as artes de onde esses arquivos saem, e
o que foi guardado para o caso de precisar.

Regra de bolso: **se o site mostra, está em `public/images/`; se é para gerar
ou guardar, está aqui.**

| Pasta | O que tem | Para quê |
|---|---|---|
| `selecoes/` | escudos de federação de todos os países (`brasil.svg`, `holanda.svg`…), com `ORIGEM.json` dizendo de onde veio cada um | `cd backend && npx tsx scripts/import-national-crests.ts` tira as estrelas de título, recorta e grava `selecao_<país>.svg` em `public/images/times/` |
| `campeonatos/<categoria>/` | artes originais dos campeonatos (brasileirão, copas nacionais, continentais, europa, estaduais) | `cd backend && npx tsx scripts/crop-competition-logo.ts <original> <destino>` gera o recorte em `public/images/campeonatos/site/` |
| `canais/` | versões alternativas de logos de canal (SVG, onde o site usa PNG) | guardadas; nada as lê |
| `marca/` | variantes do logo e dos ícones do site | guardadas; nada as lê |
| `escudos-sem-cadastro/` | escudos de clubes que não estão no registro (`packages/shared/src/team.ts`) | se um clube entrar no registro, copie o arquivo para `public/images/times/` |

Dois cuidados:
- Para **mudar um escudo de seleção**, troque o arquivo em `selecoes/` (com o
  nome do país em português, sem acento, com `_`) e rode o importador. Editar
  só o `selecao_*.svg` de `public/` funciona até a próxima vez que alguém
  rodar o importador, que o refaz a partir de `selecoes/`.
- Os escudos do **Instagram** têm cópia própria, em
  `backend/src/instagram/assets/crests/`, que já difere da do site em vários
  clubes. Não é sincronizada automaticamente.

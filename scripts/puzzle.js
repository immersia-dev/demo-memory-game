// === CONFIGURAÇÕES ===
const DEFAULT_POSITIONS = [
  "0.25 0.9 -4.25",
  "0.25 0.9 -4",
  "0.25 0.9 -3.75",
  "0.55 0.9 -4.25",
  "0.55 0.9 -4",
  "0.55 0.9 -3.75",
  "0.85 0.9 -4.25",
  "0.85 0.9 -4",
  "0.85 0.9 -3.75",
  "1.15 0.9 -4.25",
  "1.15 0.9 -4",
  "1.15 0.9 -3.75",
];

const BASE_COLORS = [
  "#e74c3c",
  "#3498db",
  "#2ecc71",
  "#f1c40f",
  "#9b59b6",
  "#e67e22",
];
const BACK_COLOR = "#8a8a8a";

const CARD_SIZE = 0.2; // tamanho uniforme da carta

// --- Estado do jogo (simples) ---
let moveCount = 0;
let currentPair = []; // array de <a-entity> cartas abertas nesta jogada (0..2)
let isResolving = false; // trava cliques enquanto avalia o par
const EVAL_DELAY = 550; // ms: tempo antes de fechar cartas erradas

// === FUNÇÕES ===
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function spawnMemoryCards(sceneEl) {
  // remove cartas antigas se houver
  let oldDeck = document.getElementById("memory-deck");
  if (oldDeck) oldDeck.remove();

  // cria um agrupador
  const deck = document.createElement("a-entity");
  deck.setAttribute("id", "memory-deck");
  sceneEl.appendChild(deck);

  // Delegação de eventos: qualquer clique numa face (.card-face) acha a carta ancestral (.card)

  // 🔧 anexa o handler persistente (sem once)
  deck.addEventListener("click", onDeckClick);
  // embaralha posições e cores
  const coords = shuffle([...DEFAULT_POSITIONS]);
  const palette = shuffle([...BASE_COLORS, ...BASE_COLORS]); // 6 pares = 12 cartas

  for (let i = 0; i < 12; i++) {
    const [x, y, z] = coords[i].split(" ").map(Number);

    const card = document.createElement("a-entity");
    card.setAttribute("position", `${x} ${y} ${z}`);
    card.setAttribute("rotation", "0 0 0");
    card.setAttribute("class", "card");
    card.dataset.flipped = "false";
    card.dataset.matched = "false"; // ⬅️ nova flag
    card.dataset.color = palette[i]; // ⬅️ cor da carta para comparação

    // frente (cor)
    const front = document.createElement("a-plane");
    front.classList.add("card-face"); // ⬅️ para o raycaster achar
    front.setAttribute("width", CARD_SIZE);
    front.setAttribute("height", CARD_SIZE);
    front.setAttribute("rotation", "90 0 0");
    front.setAttribute("position", "0 0.001 0");
    front.setAttribute("material", `color: ${palette[i]}; shader: flat`);

    // verso (cinza)
    const back = document.createElement("a-plane");
    back.classList.add("card-face"); // ⬅️ idem
    back.setAttribute("width", CARD_SIZE);
    back.setAttribute("height", CARD_SIZE);
    back.setAttribute("rotation", "-90 0 0");
    back.setAttribute("position", "0 -0.001 0");
    back.setAttribute("material", `color: ${BACK_COLOR}; shader: flat`);

    card.appendChild(front);
    card.appendChild(back);
    deck.appendChild(card);
  }

  console.log("[memory] 12 cartas criadas e distribuídas aleatoriamente.");
}

// === EXECUTA QUANDO A CENA CARREGAR ===
window.addEventListener("load", () => {
  const scene = document.querySelector("a-scene");
  if (scene.hasLoaded) {
    spawnMemoryCards(scene);
  } else {
    scene.addEventListener("loaded", () => spawnMemoryCards(scene));
  }
});

// para reembaralhar manualmente:
window.shuffleCards = function () {
  const scene = document.querySelector("a-scene");
  spawnMemoryCards(scene);
};

window.animate = function (cardEl, opts = {}) {
  if (!cardEl) return;

  const dur = opts.dur ?? 350;
  const easing = opts.easing ?? "easeInOutQuad";

  const isFlipped = cardEl.dataset.flipped === "true";
  const targetX =
    opts.to === "open" ? 180 : opts.to === "closed" ? 0 : isFlipped ? 0 : 180; // toggle

  // Evita empilhar a mesma animação
  cardEl.removeAttribute("animation__flip");

  // Anima direto o object3D.rotation.x (graus)
  cardEl.setAttribute(
    "animation__flip",
    `property: object3D.rotation.x; to: ${targetX}; dur: ${dur}; easing: ${easing}`
  );

  // Atualiza estado quando terminar
  function onDone() {
    cardEl.dataset.flipped = targetX === 180 ? "true" : "false";
    cardEl.removeEventListener("animationcomplete__flip", onDone);
  }
  cardEl.addEventListener("animationcomplete__flip", onDone);
};

// Lista as cartas e loga a contagem (ajuda no debug)
window.listCards = function () {
  const cards = [...document.querySelectorAll("#memory-deck .card")];
  console.log("[flipAll] cartas encontradas:", cards.length);
  return cards;
};

// Força estado (sem animação) — útil como fallback
function forceState(cardEl, to) {
  const rot = to === "open" ? "180 0 0" : "0 0 0";
  cardEl.setAttribute("rotation", rot);
  cardEl.dataset.flipped = to === "open" ? "true" : "false";
}

// Aplica animate em todas, com leve stagger para você "ver" acontecendo
window.flipAllOpen = function () {
  const cards = listCards();
  cards.forEach((c, i) => {
    // se já está aberta, garanta o estado (e evita anim duplicada)
    if (c.dataset.flipped === "true") {
      forceState(c, "open");
      return;
    }
    setTimeout(() => animate(c, { to: "open" }), i * 30);
  });
};

window.flipAllClosed = function () {
  const cards = listCards();
  cards.forEach((c, i) => {
    if (c.dataset.flipped === "false") {
      forceState(c, "closed");
      return;
    }
    setTimeout(() => animate(c, { to: "closed" }), i * 30);
  });
};

function setMoveCount(n) {
  moveCount = n;
  const label = document.getElementById("play_count");
  if (label) label.setAttribute("text", "value", String(moveCount));
}

// ao carregar a cena
(function initUI() {
  const scene = document.querySelector("a-scene");

  const afterSceneLoaded = () => {
    setMoveCount(0); // ✅ já começa zerado

    const btn = document.getElementById("reload_button");
    if (btn) btn.addEventListener("click", resetGame);
  };

  if (scene?.hasLoaded) afterSceneLoaded();
  else scene.addEventListener("loaded", afterSceneLoaded);
})();

function resetGame() {
  setMoveCount(0);
  currentPair = [];
  isResolving = false;

  const scene = document.querySelector("a-scene");
  spawnMemoryCards(scene); // recria as cartas (novas cores/posições)

  // (opcional) limpar qualquer texto de vitória
  const label = document.getElementById("play_count");
  if (label) label.setAttribute("text", "value", String(moveCount));
}

// Tenta abrir uma carta (só conta quando formar par)
function tryOpenCard(card) {
  if (!card) return;
  if (isResolving) return; // ⛔ bloqueia enquanto avalia
  if (card.dataset.matched === "true") return; // já combinada → ignora
  if (card.dataset.flipped === "true") return; // já aberta nesta jogada → ignora

  animate(card, { to: "open" });
  currentPair.push(card);

  if (currentPair.length === 2) {
    // fechamos a jogada
    setMoveCount(moveCount + 1);

    const [a, b] = currentPair;
    currentPair = [];
    isResolving = true;

    if (a.dataset.color === b.dataset.color) {
      // ✅ MATCH: mantêm abertas e desabilita interação
      a.dataset.matched = "true";
      b.dataset.matched = "true";
      disableCardInteraction(a);
      disableCardInteraction(b);
      isResolving = false;
      checkWin();
    } else {
      // ❌ MISMATCH: fecha depois de um pequeno delay
      setTimeout(() => {
        animate(a, { to: "closed" });
        animate(b, { to: "closed" });
        // animate() já atualiza dataset.flipped no complete
        isResolving = false;
      }, EVAL_DELAY);
    }
  }
}

function onDeckClick(e) {
  const face = e.target;
  if (!face?.classList?.contains("card-face")) return;
  const card = face.closest(".card");
  tryOpenCard(card);
}

function disableCardInteraction(card) {
  // remove a classe das faces para o raycaster parar de “acertar”
  card
    .querySelectorAll(".card-face")
    .forEach((f) => f.classList.remove("card-face"));
}

function enableCardInteraction(card) {
  // usado só se você quiser reabilitar depois (não precisa no fluxo atual)
  card.querySelectorAll("a-plane").forEach((f) => f.classList.add("card-face"));
}

function checkWin() {
  const matched = document.querySelectorAll(
    '#memory-deck .card[data-matched="true"]'
  ).length;
  if (matched === 12) {
    // opcional: mostrar na UI
    const label = document.getElementById("play_count");
    if (label) label.setAttribute("text", "value", `${moveCount}  (Venceu!)`);
  }
}

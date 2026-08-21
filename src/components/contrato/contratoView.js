import { fetchContract, signContract } from "../../lib/contractApi.js";
import { escapeHtml } from "../../lib/escapeHtml.js";
import { skeletonCard } from "../../lib/skeleton.js";

const CONTRACT_TITLE = "Contrato conmigo mismo/a";

const CONTRACT_PARAGRAPHS = [
  "Firmo esto no porque alguien me lo pida, sino porque decido tomarme en serio este objetivo.",
];

const CONTRACT_COMMITMENTS = [
  "Presentarme a estudiar aunque no tenga ganas, porque las ganas suelen llegar después de empezar, no antes.",
  "No mentirme marcando tareas como hechas si no lo están.",
  "Tratar los descansos como parte del plan, no como una distracción de la que sentirme culpable.",
  "Usar los simulacros para aprender de los fallos, no para castigarme por ellos.",
  "Ser paciente conmigo mismo/a: el progreso no siempre se nota día a día, pero se acumula.",
];

const CONTRACT_CLOSING = "Firmado, mi yo de hoy — para que mi yo del futuro se acuerde de por qué empezó.";

function contractTextHtml() {
  return `
    <p>${CONTRACT_PARAGRAPHS[0]}</p>
    <p>Me comprometo a:</p>
    <ul class="contract-commitments">
      ${CONTRACT_COMMITMENTS.map((c) => `<li>${c}</li>`).join("")}
    </ul>
    <p class="contract-closing">${CONTRACT_CLOSING}</p>
  `;
}

function setupSignaturePad(canvas) {
  const ctx = canvas.getContext("2d");
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue("--text") || "#2f3b27";

  let drawing = false;
  let hasStroke = false;
  let lastPoint = null;

  function getPos(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function onPointerDown(event) {
    drawing = true;
    hasStroke = true;
    lastPoint = getPos(event);
    canvas.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event) {
    if (!drawing) return;
    const point = getPos(event);
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPoint = point;
  }

  function onPointerUp() {
    drawing = false;
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointerleave", onPointerUp);

  return {
    hasStroke: () => hasStroke,
    clear() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasStroke = false;
    },
    toDataUrl: () => canvas.toDataURL("image/png"),
  };
}

function daysSince(dateValue) {
  const ms = Date.now() - new Date(dateValue).getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

export function renderContratoView(container) {
  container.innerHTML = `<div class="setup-block">${skeletonCard({ lines: 4 })}</div>`;

  fetchContract()
    .then((contract) => {
      if (contract) renderSigned(contract);
      else renderUnsigned();
    })
    .catch((err) => {
      console.error(err);
      container.innerHTML = `<p class="task-list-empty">No se pudo cargar el contrato.</p>`;
    });

  function renderUnsigned() {
    container.innerHTML = `
      <section class="view-contrato fx-fade-in" aria-labelledby="contrato-title">
        <h1 id="contrato-title">${CONTRACT_TITLE}</h1>

        <div class="setup-block contract-text">
          ${contractTextHtml()}
        </div>

        <div class="setup-block">
          <h2>¿Algo que quieras decirle a tu yo del futuro?</h2>
          <p class="stats-subtitle" style="margin-top:0">
            Opcional. Se te mostrará más adelante como algo que tu yo de hoy le dejó a tu yo del futuro.
          </p>
          <textarea id="past-self-comment" class="goal-input" rows="3" placeholder="(opcional)"></textarea>
        </div>

        <div class="setup-block">
          <h2>Firma</h2>
          <p class="stats-subtitle" style="margin-top:0">Dibuja tu firma con el ratón, el dedo o un lápiz digital.</p>
          <canvas id="signature-canvas" class="signature-canvas" width="600" height="200"></canvas>
          <div class="quick-add-actions">
            <button type="button" class="ft-btn" id="clear-signature-btn">Borrar firma</button>
          </div>
        </div>

        <p class="quick-add-error" id="sign-error" hidden></p>
        <button type="button" class="btn-hero" id="sign-contract-btn" disabled>
          <span class="btn-hero-icon" aria-hidden="true">📜</span>
          Firmar contrato
        </button>
      </section>
    `;

    const canvas = container.querySelector("#signature-canvas");
    const pad = setupSignaturePad(canvas);
    const signBtn = container.querySelector("#sign-contract-btn");
    const errorEl = container.querySelector("#sign-error");

    canvas.addEventListener("pointerup", () => {
      signBtn.disabled = !pad.hasStroke();
    });

    container.querySelector("#clear-signature-btn").addEventListener("click", () => {
      pad.clear();
      signBtn.disabled = true;
    });

    signBtn.addEventListener("click", async () => {
      if (!pad.hasStroke()) return;
      errorEl.hidden = true;
      signBtn.disabled = true;
      try {
        const contract = await signContract({
          signatureImage: pad.toDataUrl(),
          pastSelfComment: container.querySelector("#past-self-comment").value.trim(),
        });
        renderSigned(contract);
      } catch (err) {
        console.error(err);
        errorEl.textContent = "No se pudo guardar la firma. Inténtalo de nuevo.";
        errorEl.hidden = false;
        signBtn.disabled = false;
      }
    });
  }

  function renderSigned(contract) {
    container.innerHTML = `
      <section class="view-contrato fx-fade-in" aria-labelledby="contrato-title">
        <h1 id="contrato-title">${CONTRACT_TITLE}</h1>

        <div class="setup-block contract-text">
          ${contractTextHtml()}
        </div>

        <div class="setup-block contract-signed-block">
          <h2>Tu firma</h2>
          <img src="${contract.signature_image}" alt="Tu firma" class="contract-signature-img" />
          <p class="stats-subtitle" style="margin-top:0.75rem">
            Firmado el ${new Date(contract.signed_at).toLocaleDateString("es-ES", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })} — hace ${daysSince(contract.signed_at)} días.
          </p>
        </div>

        ${
          contract.past_self_comment
            ? `
          <div class="setup-block">
            <h2>Tu yo pasado te dejó esto</h2>
            <p class="contract-past-comment">${escapeHtml(contract.past_self_comment)}</p>
          </div>
        `
            : ""
        }
      </section>
    `;
  }
}

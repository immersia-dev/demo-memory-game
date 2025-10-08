function applyDesktopHeights() {
  const hmd = document.getElementById("hmd");
  const rig = document.getElementById("rig");
  if (!hmd || !rig) return;

  // “cabeça” a 1.6 m no desktop
  hmd.setAttribute("position", "0 1.6 0");

  // constraint soma essa altura ao snap no chão
  const data = rig.getAttribute("simple-navmesh-constraint") || {};
  rig.setAttribute("simple-navmesh-constraint", {
    ...data,
    height: 1.6, // desktop
    xzOrigin: "#hmd",
  });
}

function applyVRHeights() {
  const hmd = document.getElementById("hmd");
  const rig = document.getElementById("rig");
  if (!hmd || !rig) return;

  // em VR, o HMD já fornece a altura real
  hmd.setAttribute("position", "0 0 0");

  const data = rig.getAttribute("simple-navmesh-constraint") || {};
  rig.setAttribute("simple-navmesh-constraint", {
    ...data,
    height: 0, // VR
    xzOrigin: "#hmd",
  });
}

const scene = document.querySelector("a-scene");

// aplica desktop ao carregar
if (scene.hasLoaded) applyDesktopHeights();
else scene.addEventListener("loaded", applyDesktopHeights);

// troca automaticamente ao entrar / sair do VR
scene.addEventListener("enter-vr", applyVRHeights);
scene.addEventListener("exit-vr", applyDesktopHeights);

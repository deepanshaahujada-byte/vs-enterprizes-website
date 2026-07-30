/* Hero visual: two brand-colored masses (a V and a 5, traced from the real
   VS logo) rise out of the ground like a construction sequence, refine from
   a raw/matte finish to a polished brand-metal finish, then the camera
   cranes up to a near-top-down shot where the rooftops read as the VS mark.

   First visit: full ~5s cinematic. Repeat visit / reduced motion / ?static
   testing hook: settle straight to the final framed shot, matching the
   loader/lede conventions already used elsewhere on this page. */

import * as THREE from "three";
import { gsap } from "gsap";

const canvas = document.getElementById("hero-building");
if (canvas) {
  const params = new URLSearchParams(location.search);
  const forceStatic = params.has("static");

  // dedicated flag (independent of main.js's own "vs-seen" key) so this
  // module's timing never races the loader script that runs before it
  let seen = false;
  try {
    seen = sessionStorage.getItem("vs-hero-built") === "1";
    sessionStorage.setItem("vs-hero-built", "1");
  } catch (e) {}

  // first visit: full construction cinematic, always - never gated behind
  // prefers-reduced-motion, this is the intended hero experience regardless
  // of OS setting. ?static / repeat visit this session still settle straight
  // to the final framed shot, so a returning visitor isn't forced to rewatch
  // a 5s sequence every time they click back to Home.
  const instant = forceStatic || seen;
  const startDelay = instant ? 0 : 1.5;

  // hero copy stacks full-width above the fold below this width (matches
  // the nav's own mobile breakpoint), so the camera framing switches from
  // "beside the text" to "below the text"
  const narrow = window.innerWidth < 860;

  const COLORS = {
    bg: 0x121316,
    silver: 0xc3c8d0,
    gold: 0xd9a733,
    goldBright: 0xeec257
  };

  /* ---------- shapes, traced from the VS mark's proportions --------------- */

  function vShape() {
    const s = new THREE.Shape();
    s.moveTo(2, 88);
    s.lineTo(22, 4);
    s.lineTo(46, 82);
    s.lineTo(37, 82);
    s.lineTo(22, 26);
    s.lineTo(11, 88);
    s.closePath();
    return s;
  }

  function barShape() {
    const s = new THREE.Shape();
    s.moveTo(56, 90);
    s.lineTo(100, 90);
    s.lineTo(92, 66);
    s.lineTo(48, 66);
    s.closePath();
    return s;
  }

  function arcBandShape(cx, cy, rOuter, rInner, startDeg, endDeg) {
    const a0 = THREE.MathUtils.degToRad(startDeg);
    const a1 = THREE.MathUtils.degToRad(endDeg);
    const s = new THREE.Shape();
    s.absarc(cx, cy, rOuter, a0, a1, false);
    s.absarc(cx, cy, rInner, a1, a0, true);
    s.closePath();
    return s;
  }

  // open-topped hook: 230deg drawn arc, 130deg gap centered straight up
  // (toward the bar above), so it reads as "5", not a closed ring
  function loopShape() {
    return arcBandShape(74, 34, 24, 12, 155, 385);
  }

  /* ---------- build one mass: extruded solid + fading edge wireframe ------ */

  function buildMass(shape, height, color) {
    const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 24 });
    geo.rotateX(-Math.PI / 2);

    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.8,
      metalness: 0.1,
      emissive: new THREE.Color(color).multiplyScalar(0.04)
    });
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.scale.y = 0.0001; // grows from the ground, never literally zero (avoids degenerate matrix)

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo, 20),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
    );
    mesh.add(edges);

    return { mesh, material, edges };
  }

  /* ---------- scene -------------------------------------------------------- */

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(45, 1, 0.5, 900);
  const camTarget = narrow ? new THREE.Vector3(51, 20, -30) : new THREE.Vector3(-10, 20, -20);
  if (narrow) camera.position.set(140, 16, 90);
  else camera.position.set(-100, 14, 80);
  camera.lookAt(camTarget);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const hemi = new THREE.HemisphereLight(0x8a90a0, 0x0a0a0c, 0.65);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(COLORS.goldBright, 2.4);
  key.position.set(60, 90, 60);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -120;
  key.shadow.camera.right = 120;
  key.shadow.camera.top = 120;
  key.shadow.camera.bottom = -120;
  key.shadow.camera.far = 260;
  key.shadow.bias = -0.0015;
  scene.add(key);

  const rim = new THREE.DirectionalLight(COLORS.silver, 0.9);
  rim.position.set(-80, 40, -60);
  scene.add(rim);

  // hand-authored V+5 footprint lives in shape-space x:[2,100] y:[4,92];
  // kept at the origin - camera targeting (below) does the framing work
  const city = new THREE.Group();
  scene.add(city);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(220, 48),
    new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.95, metalness: 0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.1;
  ground.receiveShadow = true;
  city.add(ground);

  const grid = new THREE.GridHelper(440, 44, COLORS.gold, 0x24261e);
  grid.material.transparent = true;
  grid.material.opacity = 0.05;
  city.add(grid);

  const vMass = buildMass(vShape(), 46, COLORS.silver);
  const barMass = buildMass(barShape(), 34, COLORS.gold);
  const loopMass = buildMass(loopShape(), 58, COLORS.gold);
  city.add(vMass.mesh, barMass.mesh, loopMass.mesh);

  /* ---------- resize -------------------------------------------------------- */

  function resize() {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  window.addEventListener("resize", resize);
  resize();

  /* ---------- construction + camera timeline -------------------------------- */

  // steep aerial angle (~20deg off vertical) - close enough to top-down that
  // the rooftops read as the logo, far enough from true vertical to avoid the
  // lookAt() singularity that occurs when the view direction nears the
  // (0,1,0) up vector.
  //
  // Desktop: hero copy sits in a left column, so camTarget is panned well
  // left of the footprint's true center (world x=51) to push the mark into
  // the clearer right-hand side of the frame.
  // Mobile: hero copy stacks full-width above the fold, so there's no side
  // to dodge into - instead the canvas itself is CSS-confined to the lower
  // half of the hero (see style.css), and the camera aims straight at the
  // footprint's true center with no reframing trick needed.
  const finalCamTarget = narrow ? { x: 51, y: 8, z: -47 } : { x: -140, y: 8, z: -47 };
  const finalCamPos = narrow ? { x: 51, y: 300, z: 65 } : { x: -140, y: 380, z: 88 };
  const refined = { roughness: 0.28, metalness: 0.88 };

  const masses = [vMass, barMass, loopMass];

  function settleFinal() {
    masses.forEach((m) => {
      m.mesh.scale.y = 1;
      m.material.roughness = refined.roughness;
      m.material.metalness = refined.metalness;
      m.edges.material.opacity = 0.16;
    });
    camera.position.set(finalCamPos.x, finalCamPos.y, finalCamPos.z);
    camTarget.set(finalCamTarget.x, finalCamTarget.y, finalCamTarget.z);
    camera.lookAt(camTarget);
    startIdle();
  }

  function startIdle() {
    gsap.to(camera.position, {
      x: finalCamPos.x + 10,
      z: finalCamPos.z + 6,
      duration: 14,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1
    });
  }

  if (instant) {
    settleFinal();
  } else {
    gsap.set(camTarget, { x: camTarget.x, y: camTarget.y, z: camTarget.z });

    const tl = gsap.timeline({ delay: startDelay, defaults: { ease: "power2.out" } });

    // gentle drift during the establishing shot, alive rather than frozen
    const drift = narrow ? { x: 51, y: 22, z: 65 } : { x: -40, y: 20, z: 60 };
    tl.to(camera.position, { ...drift, duration: 3.1, ease: "sine.inOut" }, 0);

    masses.forEach((m, i) => {
      const t = i * 0.75;
      tl.to(m.mesh.scale, { y: 1, duration: 1.05, ease: "back.out(1.5)" }, t)
        .to(m.edges.material, { opacity: 0.85, duration: 0.3 }, t)
        .to(m.edges.material, { opacity: 0.16, duration: 1.1, ease: "power1.out" }, t + 0.9)
        .to(m.material, { roughness: refined.roughness, metalness: refined.metalness, duration: 1.3, ease: "power1.inOut" }, t + 0.5);
    });

    tl.to(camera.position, {
      x: finalCamPos.x, y: finalCamPos.y, z: finalCamPos.z,
      duration: 2.1, ease: "power3.inOut"
    }, 2.85)
      .to(camTarget, {
        x: finalCamTarget.x, y: finalCamTarget.y, z: finalCamTarget.z,
        duration: 2.1, ease: "power3.inOut",
        onUpdate: () => camera.lookAt(camTarget)
      }, 2.85)
      .call(startIdle);
  }

  /* ---------- render loop, paused off-screen / tab-hidden -------------------- */

  function tick() {
    camera.lookAt(camTarget);
    renderer.render(scene, camera);
  }

  let inView = true;
  function sync() {
    renderer.setAnimationLoop(inView && !document.hidden ? tick : null);
  }

  new IntersectionObserver((entries) => {
    inView = entries[0].isIntersecting;
    sync();
  }).observe(canvas);

  document.addEventListener("visibilitychange", sync);

  sync();
}

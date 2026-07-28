/* WebGL background for the home hero.
   Molten-gold veins drifting through charcoal, angled to match the logo's cut.
   Pauses offscreen and when the tab is hidden; renders one static frame
   under prefers-reduced-motion. No libraries. */

(function () {
  var canvas = document.getElementById("shader");
  if (!canvas) return;

  var gl = canvas.getContext("webgl", { antialias: false, alpha: false });
  if (!gl) { canvas.remove(); return; }

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var VERT =
    "attribute vec2 p;" +
    "void main(){gl_Position=vec4(p,0.,1.);}";

  var FRAG = [
    /* fp16 mediump collapses the sin-hash on mobile GPUs; use highp when available */
    "#ifdef GL_FRAGMENT_PRECISION_HIGH",
    "precision highp float;",
    "#else",
    "precision mediump float;",
    "#endif",
    "uniform vec2 u_res;",
    "uniform float u_t;",
    "uniform vec2 u_mouse;",

    "float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}",

    "float noise(vec2 p){",
    "  vec2 i=floor(p);vec2 f=fract(p);",
    "  vec2 u=f*f*(3.-2.*f);",
    "  return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),",
    "             mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y);",
    "}",

    "float fbm(vec2 p){",
    "  float v=0.;float a=.5;",
    "  for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec2(11.3,7.9);a*=.5;}",
    "  return v;",
    "}",

    "void main(){",
    "  vec2 uv=(gl_FragCoord.xy-.5*u_res)/u_res.y;",
    "  float t=u_t*.045;",

    /* rotate space to the logo's diagonal (~-32deg) */
    "  float ang=-.56;",
    "  mat2 rot=mat2(cos(ang),-sin(ang),sin(ang),cos(ang));",
    "  vec2 q=rot*uv;",

    /* domain-warped fbm */
    "  vec2 drift=vec2(t*.6,-t*.25)+u_mouse*.08;",
    "  float w1=fbm(q*1.6+drift);",
    "  float w2=fbm(q*1.6+vec2(w1*1.7,-w1*1.2)-drift*.7);",
    "  float n=fbm(q*2.2+vec2(w2*1.5,w1*1.1));",

    /* charcoal body with graphite variation */
    "  vec3 base=vec3(.055,.058,.066);",
    "  vec3 graphite=vec3(.11,.115,.13);",
    "  vec3 col=mix(base,graphite,smoothstep(.2,.85,w2));",

    /* thin molten-gold veins where the field crosses its midline */
    "  float vein=pow(1.-abs(n*2.-1.),14.);",
    "  float veinSoft=pow(1.-abs(n*2.-1.),4.);",
    "  vec3 gold=vec3(.85,.65,.2);",
    "  vec3 goldDeep=vec3(.55,.38,.1);",

    /* veins concentrate toward the right, leaving copy side calm */
    "  float sideFade=smoothstep(-.55,.75,uv.x);",
    "  col+=goldDeep*veinSoft*.16*sideFade;",
    "  col+=gold*vein*.75*sideFade;",

    /* faint diagonal light plane echoing the card layout */
    "  float beam=smoothstep(.5,.0,abs(q.y+.18));",
    "  col+=vec3(.05,.05,.055)*beam*.5;",

    /* vignette */
    "  col*=1.-.45*dot(uv,uv);",

    "  gl_FragColor=vec4(col,1.);",
    "}"
  ].join("\n");

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      return null;
    }
    return s;
  }

  var vs = compile(gl.VERTEX_SHADER, VERT);
  var fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) { canvas.remove(); return; }

  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.useProgram(prog);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  var uRes = gl.getUniformLocation(prog, "u_res");
  var uT = gl.getUniformLocation(prog, "u_t");
  var uMouse = gl.getUniformLocation(prog, "u_mouse");

  var mouse = [0, 0], mouseTarget = [0, 0];

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var w = canvas.clientWidth * dpr, h = canvas.clientHeight * dpr;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  var visible = true, raf = 0, start = performance.now();

  function frame(now) {
    raf = 0;
    resize();
    // spring the mouse-parallax toward its target so it never snaps
    mouse[0] += (mouseTarget[0] - mouse[0]) * 0.05;
    mouse[1] += (mouseTarget[1] - mouse[1]) * 0.05;
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uT, ((now - start) / 1000) % 3600); /* wrap time so precision never drifts */
    gl.uniform2f(uMouse, mouse[0], mouse[1]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!reduceMotion && visible && !document.hidden) raf = requestAnimationFrame(frame);
  }

  function play() { if (!raf) raf = requestAnimationFrame(frame); }

  new IntersectionObserver(function (entries) {
    visible = entries[0].isIntersecting;
    if (visible) play();
  }).observe(canvas);

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) play();
  });

  // under reduced motion the loop never reschedules, so render one corrected
  // frame per resize; while animating this is a no-op
  window.addEventListener("resize", play);

  if (!reduceMotion) {
    window.addEventListener("pointermove", function (e) {
      mouseTarget[0] = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseTarget[1] = (e.clientY / window.innerHeight - 0.5) * -2;
    }, { passive: true });
  }

  play();
})();

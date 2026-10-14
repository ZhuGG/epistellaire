import * as THREE from 'three';

// Chaque scan reste entier : pas de découpage en faux rectos / versos.
// Le verso papier et la reliure sont uniquement une scénographie virtuelle.
export class Book {
  constructor(stage, pages, asset) {
    this.stage = stage; this.pages = pages; this.asset = asset;
    this.cache = new Map(); this.index = 0; this.frame = 0; this.disposed = false; this.turn = null;
    this.width = 4.65; this.height = 3.4;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-4, 4, 3, -3, .1, 40);
    this.camera.position.set(0, .9, 10); this.camera.lookAt(0, 0, 0);
    this.readingCamera = this.camera;
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0, 0);
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    stage.prepend(this.renderer.domElement);
    this.scene.add(new THREE.AmbientLight(0xffffff, 2.1));
    const light = new THREE.DirectionalLight(0xffffff, 2.6);
    light.position.set(-3, 5, 8); light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024); light.shadow.camera.left = -8; light.shadow.camera.right = 8;
    light.shadow.camera.top = 6; light.shadow.camera.bottom = -6; light.shadow.bias = -.001;
    light.shadow.normalBias = .025; this.scene.add(light);
    this.group = new THREE.Group(); this.group.rotation.z = -.018; this.scene.add(this.group);
    this.resources = [];
    const mesh = (geometry, material) => { this.resources.push(geometry, material); return new THREE.Mesh(geometry, material); };
    const shadow = mesh(new THREE.PlaneGeometry(25, 18), new THREE.ShadowMaterial({ opacity: .18 }));
    shadow.position.z = -.24; shadow.receiveShadow = true; this.scene.add(shadow);
    const cover = mesh(new THREE.BoxGeometry(this.width + .1, this.height + .1, .075), new THREE.MeshStandardMaterial({ color: '#59665e', roughness: .92 }));
    cover.position.z = -.14; cover.castShadow = true; this.group.add(cover);
    for (let i = 0; i < 9; i++) {
      const leaf = mesh(new THREE.BoxGeometry(this.width + .025, this.height + .015, .009), new THREE.MeshStandardMaterial({ color: i % 2 ? '#e3ded0' : '#f4efdf', roughness: 1 }));
      leaf.position.set(.012 + i * .001, -.005 - i * .001, -.094 + i * .010);
      this.group.add(leaf);
    }
    const spine = mesh(new THREE.BoxGeometry(.055, this.height + .07, .14), new THREE.MeshStandardMaterial({ color: '#877c59', roughness: .9 }));
    spine.position.set(-this.width / 2 - .028, 0, -.05); this.group.add(spine);
    this.bottom = mesh(new THREE.PlaneGeometry(this.width, this.height), new THREE.MeshBasicMaterial({ color: '#f6f1e5' }));
    this.bottom.position.z = .012; this.group.add(this.bottom);
    this.segments = 96;
    this.geometry = new THREE.PlaneGeometry(this.width, this.height, this.segments, 12);
    this.geometry.translate(this.width / 2, 0, 0);
    this.restPositions = this.geometry.attributes.position.array.slice();
    this.frontMaterial = new THREE.MeshBasicMaterial({ side: THREE.FrontSide });
    // Ombre de courbure achromatique : les couleurs restent celles du scan.
    this.frontMaterial.onBeforeCompile = shader => {
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vPaperNormal;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvPaperNormal = normalize(normalMatrix * normal);');
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vPaperNormal;').replace('#include <opaque_fragment>', 'float paperShade = mix(0.72, 1.0, smoothstep(0.0, 0.8, abs(vPaperNormal.z)));\noutgoingLight *= paperShade;\n#include <opaque_fragment>');
    };
    this.backMaterial = new THREE.MeshStandardMaterial({ color: '#efe7d5', roughness: .95, side: THREE.BackSide });
    this.resources.push(this.geometry, this.frontMaterial, this.backMaterial);
    this.sheet = new THREE.Group(); this.sheet.position.set(-this.width / 2, 0, .045);
    this.front = new THREE.Mesh(this.geometry, this.frontMaterial); this.front.castShadow = true;
    this.back = new THREE.Mesh(this.geometry, this.backMaterial); this.back.castShadow = true;
    this.sheet.add(this.front, this.back); this.group.add(this.sheet);
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(stage);
    this.resize();
  }
  resize() {
    const { width, height } = this.stage.getBoundingClientRect();
    if (!width || !height || this.disposed) return;
    const aspect = width / height;
    const vertical = Math.max(4.15, (this.width + (width < 650 ? .5 : 1.7)) / aspect);
    this.vertical = vertical;
    this.readingCamera.left = -vertical * aspect / 2; this.readingCamera.right = vertical * aspect / 2;
    this.readingCamera.top = vertical / 2; this.readingCamera.bottom = -vertical / 2;
    this.readingCamera.updateProjectionMatrix();
    if (this.camera.isPerspectiveCamera) {
      this.camera.aspect = aspect;
      const distance = vertical / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)));
      this.camera.position.set(0, distance * .09, distance); this.camera.lookAt(0, 0, 0); this.camera.updateProjectionMatrix();
    }
    this.renderer.setSize(width, height); this.render();
  }
  async texture(index) {
    if (this.cache.has(index)) return this.cache.get(index);
    const pending = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas'); canvas.width = 1800; canvas.height = Math.round(1800 * this.height / this.width);
        const context = canvas.getContext('2d'); context.fillStyle = '#f6f1e5'; context.fillRect(0, 0, canvas.width, canvas.height);
        const scale = Math.min(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
        const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
        context.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
        const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
        if (this.disposed) { texture.dispose(); reject(new Error('Livre fermé')); return; }
        resolve(texture);
      };
      img.onerror = () => { this.cache.delete(index); reject(new Error('Image indisponible')); };
      img.src = this.asset(this.pages[index].image);
    });
    this.cache.set(index, pending); return pending;
  }
  render() { if (!this.disposed) this.renderer.render(this.scene, this.camera); }
  bend(progress) {
    const angle = progress * Math.PI, curl = Math.sin(progress * Math.PI);
    const dx = this.width / this.segments;
    const curve = [{ x: 0, z: 0 }];
    // Intégrer la tangente conserve la longueur du papier : le feuillet se
    // courbe sans s'étirer. Le bord libre accuse un retard sur la reliure.
    for (let column = 1; column <= this.segments; column++) {
      const u = (column - .5) / this.segments;
      const tangent = angle - curl * .8 * Math.sin(u * Math.PI * .82);
      const last = curve[column - 1];
      curve.push({ x: last.x + Math.cos(tangent) * dx, z: last.z + Math.sin(tangent) * dx });
    }
    const positions = this.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const column = i % (this.segments + 1), ratio = column / this.segments;
      const y = this.restPositions[i * 3 + 1];
      const edgeLift = curl * .035 * Math.pow(ratio, 3) * Math.pow(y / this.height, 2);
      positions.setXYZ(i, curve[column].x, y, curve[column].z + edgeLift);
    }
    positions.needsUpdate = true; this.geometry.computeVertexNormals(); this.geometry.computeBoundingSphere();
    this.render();
  }
  preload() {
    const index = this.index;
    for (const neighbor of [index - 1, index + 1]) if (neighbor >= 0 && neighbor < this.pages.length) this.texture(neighbor).catch(() => {});
  }
  async introduce(index, signal) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || signal.aborted) { await this.show(index, false); return; }
    await this.show(0, false);
    if (signal.aborted) { await this.show(index, false); return; }
    const camera = new THREE.PerspectiveCamera(32, 1, .1, 200);
    this.camera = camera; this.resize();
    try {
      await new Promise(resolve => {
        this.animationResolve = resolve;
        const start = performance.now();
        const tick = now => {
          if (signal.aborted || this.disposed) { resolve(); return; }
          const t = Math.min(1, (now - start) / 1900), ease = 1 - Math.pow(1 - t, 3);
          // Un mouvement unique, de la tranche vers la couverture.
          this.group.rotation.set(-.30 * (1 - ease), -.72 * (1 - ease), -.085 * (1 - ease) - .018 * ease);
          this.group.scale.z = 1 + 1.8 * (1 - ease);
          camera.fov = 32 * (1 - ease) + 8 * ease;
          const distance = this.vertical / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
          camera.position.set(0, distance * .09, distance); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix(); this.render();
          if (t < 1) this.frame = requestAnimationFrame(tick); else resolve();
        };
        this.frame = requestAnimationFrame(tick);
      });
      this.animationResolve = null;
    } finally {
      this.group.rotation.set(0, 0, -.018); this.group.scale.z = 1;
      this.camera = this.readingCamera; this.resize();
    }
    if (signal.aborted) { await this.show(index, false); return; }
    if (index !== 0) {
      await this.beginTurn(index);
      // Le signal arrête aussi l'ouverture ; finishTurn surveille l'abandon.
      await this.finishTurn(true, 0, signal);
    }
  }
  async show(index, animate = true) {
    if (animate && index !== this.index && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      await this.beginTurn(index); await this.finishTurn(true); return;
    }
    const texture = await this.texture(index);
    if (this.disposed) return;
    this.index = index; this.frontMaterial.map = texture; this.frontMaterial.needsUpdate = true;
    this.bottom.material.map = texture; this.bottom.material.needsUpdate = true;
    this.bend(0); this.preload();
  }
  async beginTurn(index) {
    const next = await this.texture(index);
    if (this.disposed) return;
    const previous = this.frontMaterial.map, forward = index > this.index;
    this.turn = { index, previous, next, forward, progress: 0 };
    this.frontMaterial.map = forward ? previous : next;
    this.bottom.material.map = forward ? next : previous;
    this.frontMaterial.needsUpdate = true; this.bottom.material.needsUpdate = true;
    this.scrub(0);
  }
  scrub(progress) {
    if (!this.turn || this.disposed) return;
    this.turn.progress = Math.max(0, Math.min(1, progress));
    this.bend(this.turn.forward ? this.turn.progress : 1 - this.turn.progress);
  }
  async finishTurn(commit, velocity = 0, signal = null) {
    if (!this.turn || this.disposed) return;
    const target = commit ? 1 : 0, turn = this.turn;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduced) await new Promise(resolve => {
      this.animationResolve = resolve;
      let x = turn.progress, v = Math.max(-2, Math.min(2, velocity)), last = performance.now();
      const start = last;
      // Ressort amorti : continuité avec la vitesse du geste, sans rebond dur.
      const tick = now => {
        if (this.disposed || signal?.aborted) { resolve(); return; }
        const dt = Math.min(.025, (now - last) / 1000); last = now;
        v += ((target - x) * 75 - v * 17.5) * dt; x += v * dt;
        this.scrub(x);
        if ((Math.abs(target - x) < .001 && Math.abs(v) < .015) || now - start > 1600) resolve();
        else this.frame = requestAnimationFrame(tick);
      };
      this.frame = requestAnimationFrame(tick);
    });
    this.animationResolve = null;
    if (this.disposed) return;
    const texture = commit ? turn.next : turn.previous;
    if (commit) this.index = turn.index;
    this.frontMaterial.map = texture; this.frontMaterial.needsUpdate = true;
    this.bottom.material.map = texture; this.bottom.material.needsUpdate = true;
    this.turn = null; this.bend(0); this.preload();
  }
  dispose() {
    this.disposed = true; cancelAnimationFrame(this.frame); this.observer.disconnect();
    this.animationResolve?.(); this.animationResolve = null;
    for (const value of this.cache.values()) value.then(texture => texture.dispose()).catch(() => {});
    for (const resource of this.resources) resource.dispose();
    this.renderer.dispose(); this.renderer.domElement.remove();
  }
}

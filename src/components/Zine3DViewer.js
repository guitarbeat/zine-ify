import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MINI_ZINE_STACKS, computeMiniZineFoldState } from '../utils/miniZineFold.js';

import { normalizePreviewPage } from '../utils/previewHelpers.js';

export class Zine3DViewer {
  constructor(containerElement) {
    this.container = containerElement;
    this.pages = [];
    this.stacks = [];
    this.seams = [];
    this.guides = [];
    this.environmentMeshes = [];
    this.w = 1.0;
    this.h = 1.414; // A-series proportion
    this.panelThickness = 0.002;
    this.stackDepthStep = 0.008;
    this.seamWidth = 0.035;
    this.guideWidth = 0.015;
    this.cutGuideWidth = 0.028;
    this.cutGuideCapHeight = 0.14;
    this.isFallbackMode = false;
    this.fallbackCanvas = null;
    this.fallbackContext = null;
    this.fallbackPages = [];
    this.fallbackFoldProgress = 0;
    this.tmpVecC = new THREE.Vector3();
    this.tmpVecD = new THREE.Vector3();
    this.tmpMat = new THREE.Matrix4();
    this.sheetMaterialColor = 0xf4f1ea;
    this.foldGuideColor = 0xb8b8b8;
    this.slitGuideColor = 0xd32f2f;
    this.cameraTarget = new THREE.Vector3(0, 0, 0);
    
    this.panelDefinitions = {
      1: { stackIndex: 3, isTop: false }, // Cover
      2: { stackIndex: 3, isTop: true }, // Inside cover
      3: { stackIndex: 2, isTop: true },
      4: { stackIndex: 1, isTop: true },
      5: { stackIndex: 0, isTop: true },
      6: { stackIndex: 0, isTop: false },
      7: { stackIndex: 1, isTop: false },
      8: { stackIndex: 2, isTop: false } // Back cover
    };
    this.connectionDefinitions = [
      { from: 5, to: 4, orientation: 'horizontal' },
      { from: 4, to: 3, orientation: 'horizontal' },
      { from: 3, to: 2, orientation: 'horizontal' },
      { from: 6, to: 7, orientation: 'horizontal' },
      { from: 7, to: 8, orientation: 'horizontal' },
      { from: 8, to: 1, orientation: 'horizontal' },
      { from: 5, to: 6, orientation: 'vertical' },
      { from: 2, to: 1, orientation: 'vertical' }
    ];
    this.guideDefinitions = [
      { type: 'fold', orientation: 'vertical', x: -this.w, y: 0, length: this.h * 2 },
      { type: 'fold', orientation: 'vertical', x: 0, y: 0, length: this.h * 2 },
      { type: 'fold', orientation: 'vertical', x: this.w, y: 0, length: this.h * 2 },
      { type: 'fold', orientation: 'horizontal', x: -1.5 * this.w, y: 0, length: this.w },
      { type: 'fold', orientation: 'horizontal', x: 1.5 * this.w, y: 0, length: this.w },
      { type: 'slit', orientation: 'horizontal', x: 0, y: 0, length: this.w * 2 }
    ];
    this.debugFoldState = null;
    this.currentFoldProgress = 0;
    
    this.initScene();
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#1a1a1a');

    const initialWidth = this.container.clientWidth || 1;
    const initialHeight = this.container.clientHeight || 1;
    this.camera = new THREE.PerspectiveCamera(45, initialWidth / initialHeight, 0.1, 100);
    this.camera.position.set(0, 0, 4.6);

    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      this.renderer.setSize(initialWidth, initialHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.domElement.classList.add('zine-3d-canvas');
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.container.appendChild(this.renderer.domElement);
    } catch {
      this.initFallbackScene(initialWidth, initialHeight);
      return;
    }

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enablePan = false;
    this.controls.minDistance = 2.8;
    this.controls.maxDistance = 9;
    this.controls.maxPolarAngle = Math.PI * 0.56;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
    dirLight.position.set(2, 6, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 12;
    this.scene.add(dirLight);
    
    const backLight = new THREE.DirectionalLight(0xffffff, 0.45);
    backLight.position.set(-2, -4, -4);
    this.scene.add(backLight);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3a55, 0.45));
    this.createStageEnvironment();

    // Resize handler
    this.onWindowResize = () => this.refreshLayout();
    window.addEventListener('resize', this.onWindowResize);

    this.animate();
  }

  initFallbackScene(initialWidth, initialHeight) {
    this.isFallbackMode = true;
    this.fallbackCanvas = document.createElement('canvas');
    this.fallbackCanvas.className = 'zine-3d-fallback-canvas';
    this.fallbackContext = this.fallbackCanvas.getContext('2d', { alpha: false });
    this.container.appendChild(this.fallbackCanvas);

    this.onWindowResize = () => this.refreshLayout();
    window.addEventListener('resize', this.onWindowResize);
    this.refreshLayout(initialWidth, initialHeight);
  }

  renderFallback() {
    if (!this.isFallbackMode || !this.fallbackCanvas || !this.fallbackContext) {
      return;
    }

    const width = this.fallbackCanvas.width || 1;
    const height = this.fallbackCanvas.height || 1;
    const context = this.fallbackContext;

    context.fillStyle = '#111111';
    context.fillRect(0, 0, width, height);

    const gradient = context.createRadialGradient(width * 0.35, height * 0.2, 0, width * 0.5, height * 0.5, width * 0.7);
    gradient.addColorStop(0, 'rgba(232,149,95,0.22)');
    gradient.addColorStop(0.45, 'rgba(232,149,95,0.06)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    const state = computeMiniZineFoldState(this.fallbackFoldProgress, {
      w: this.w,
      h: this.h,
      stackDepthStep: this.stackDepthStep
    });
    const bounds = state.bounds;
    const useFlatAxis = this.fallbackFoldProgress < 0.95;
    const modelWidth = Math.max(0.1, bounds.max.x - bounds.min.x);
    const modelHeight = useFlatAxis
      ? Math.max(0.1, bounds.max.y - bounds.min.y)
      : Math.max(0.1, bounds.max.z - bounds.min.z + this.h * 0.75);
    const scale = Math.min((width * 0.72) / modelWidth, (height * 0.62) / modelHeight);
    const centerX = (bounds.min.x + bounds.max.x) / 2;
    const centerY = useFlatAxis
      ? (bounds.min.y + bounds.max.y) / 2
      : (bounds.min.z + bounds.max.z) / 2;
    const pageOrder = [6, 7, 8, 1, 5, 4, 3, 2];

    context.save();
    context.translate(width / 2, height / 2 + height * 0.02);
    context.shadowColor = 'rgba(0,0,0,0.28)';
    context.shadowBlur = Math.max(8, width * 0.018);
    context.shadowOffsetY = Math.max(4, height * 0.01);

    pageOrder.forEach((pageId) => {
      const pageState = state.pages[pageId];
      if (!pageState) {
        return;
      }
      const page = this.fallbackPages[pageId - 1];
      const loaded = !!(page?.previewUrl || page?.sourceUrl);
      const x = (pageState.position.x - centerX) * scale;
      const ySource = useFlatAxis ? -pageState.position.y : -pageState.position.z;
      const y = (ySource + centerY) * scale;
      const panelWidth = this.w * scale * (useFlatAxis ? 0.96 : 0.72);
      const panelHeight = this.h * scale * (useFlatAxis ? 0.96 : 0.45);

      context.save();
      context.translate(x, y);
      if (!useFlatAxis) {
        context.rotate(pageState.rotation.y * 0.18);
      }
      context.fillStyle = loaded ? '#fffdf8' : '#f4eadb';
      context.strokeStyle = pageId === 1 ? '#e8955f' : 'rgba(61,52,40,0.34)';
      context.lineWidth = Math.max(1, scale * 0.012);
      context.beginPath();
      context.roundRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, Math.max(3, scale * 0.025));
      context.fill();
      context.stroke();
      context.shadowColor = 'transparent';
      context.fillStyle = pageId === 1 ? '#9e4529' : '#3d3428';
      context.font = `700 ${Math.max(11, scale * 0.16)}px Inter, sans-serif`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(pageId === 1 ? 'Cover' : `P${pageId}`, 0, 0);
      context.restore();
    });
    context.restore();

    const loadedPages = this.fallbackPages.filter((page) => page?.previewUrl || page?.sourceUrl).length;
    context.fillStyle = 'rgba(255,253,248,0.86)';
    context.font = `700 ${Math.max(12, width * 0.026)}px Inter, sans-serif`;
    context.textAlign = 'left';
    context.fillText(`${loadedPages} pages loaded`, Math.max(16, width * 0.05), height - Math.max(18, height * 0.06));
  }

  createStageEnvironment() {
    const floorGeometry = new THREE.PlaneGeometry(6.2, 4.4);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x1c1713,
      roughness: 0.92,
      metalness: 0
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.position.z = -0.06;
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.environmentMeshes.push({ mesh: floor, geometry: floorGeometry, material: floorMaterial });
  }

  /**
   * Initializes or updates the page textures.
   * @param {Array} imageUrls - Array of 8 image URLs (blob URLs or data URIs)
   */
  loadPages(imageUrls) {
    if (this.isFallbackMode) {
      this.fallbackPages = (imageUrls || []).map((page) => normalizePreviewPage(page));
      this.renderFallback();
      return;
    }

    const previewPages = (imageUrls || []).map((page) => normalizePreviewPage(page));

    // Clear existing planes
    this.pages.forEach((page) => {
      page.frontMaterial?.map?.dispose?.();
      page.frontMaterial?.dispose?.();
      page.backMaterial?.dispose?.();
      page.frontGeometry?.dispose?.();
      page.backGeometry?.dispose?.();
    });
    this.stacks.forEach((stack) => {
      this.scene.remove(stack.group);
    });
    this.seams.forEach((seam) => {
      this.scene.remove(seam.mesh);
      seam.material?.dispose?.();
      seam.geometry?.dispose?.();
    });
    this.guides.forEach((guide) => {
      this.scene.remove(guide.mesh);
      (guide.materials ?? [guide.material]).forEach((material) => material?.dispose?.());
      (guide.geometries ?? [guide.geometry]).forEach((geometry) => geometry?.dispose?.());
    });
    this.pages = [];
    this.stacks = [];
    this.seams = [];
    this.guides = [];

    const textureLoader = new THREE.TextureLoader();

    MINI_ZINE_STACKS.forEach((stackDefinition) => {
      const group = new THREE.Group();
      this.scene.add(group);
      this.stacks.push({
        index: stackDefinition.index,
        group
      });
    });
    
    for (let i = 1; i <= 8; i++) {
      const config = this.panelDefinitions[i];
      const pageData = previewPages[i - 1]; // Array is 0-indexed
      const url = pageData?.previewUrl || pageData?.sourceUrl || null;

      const stack = this.stacks[config.stackIndex]; // ⚡️ Bolt: Optimize O(N) array search inside high-frequency animation loop using direct index lookup.
      const group = new THREE.Group();
      const frontGeometry = new THREE.PlaneGeometry(this.w, this.h, 4, 4);
      const backGeometry = new THREE.PlaneGeometry(this.w, this.h, 1, 1);

      let frontMaterial;
      if (url) {
        const texture = textureLoader.load(url);
        texture.colorSpace = THREE.SRGBColorSpace;
        if (config.isTop) {
          texture.center.set(0.5, 0.5);
          texture.rotation = Math.PI;
        }
        frontMaterial = new THREE.MeshStandardMaterial({
          map: texture,
          side: THREE.FrontSide,
          roughness: 0.85
        });
      } else {
        frontMaterial = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          side: THREE.FrontSide,
          roughness: 0.85
        });
      }

      const backMaterial = new THREE.MeshStandardMaterial({
        color: this.sheetMaterialColor,
        side: THREE.DoubleSide,
        roughness: 0.95
      });

      const frontMesh = new THREE.Mesh(frontGeometry, frontMaterial);
      frontMesh.castShadow = true;
      frontMesh.receiveShadow = true;
      frontMesh.position.z = this.panelThickness;
      frontMesh.position.y = config.isTop ? this.h / 2 : -this.h / 2;

      const backMesh = new THREE.Mesh(backGeometry, backMaterial);
      backMesh.castShadow = true;
      backMesh.receiveShadow = true;
      backMesh.rotation.y = Math.PI;
      backMesh.position.z = -this.panelThickness;
      backMesh.position.y = config.isTop ? this.h / 2 : -this.h / 2;

      group.add(frontMesh);
      group.add(backMesh);
      stack?.group.add(group);
      
      this.pages.push({
        id: i,
        group,
        stackGroup: stack?.group ?? null,
        config,
        frontMaterial,
        backMaterial,
        frontGeometry,
        backGeometry
      });
    }

    this.createSeams();
    this.createGuides();

    // Initialize layout flat
    this.setFoldProgress(0);
    
    // Automatically adjust camera slightly so the flat sheet fits
    this.camera.position.set(0, 0, 4.9);
    this.controls.target.copy(this.cameraTarget);
    this.controls.update();
    this.refreshLayout();
  }

  refreshLayout() {
    const width = this.container.clientWidth || 1;
    const height = this.container.clientHeight || 1;

    if (this.isFallbackMode) {
      if (this.fallbackCanvas) {
        this.fallbackCanvas.width = Math.max(1, Math.floor(width));
        this.fallbackCanvas.height = Math.max(1, Math.floor(height));
        this.fallbackCanvas.style.width = `${width}px`;
        this.fallbackCanvas.style.height = `${height}px`;
      }
      this.renderFallback();
      return;
    }

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x111111, 1);
  }

  /**
   * progressed folded state 0 to 3
   * The mini-zine is formed by folding lengthwise, opening the center slit
   * into the diamond/plus shape, then closing the booklet.
   * @param {number} progress  0=flat, 1=lengthwise fold, 2=diamond open, 3=closed booklet
   */
  setFoldProgress(progress) {
    this.currentFoldProgress = progress;
    if (this.isFallbackMode) {
      this.fallbackFoldProgress = progress;
      this.renderFallback();
      return;
    }

    const state = computeMiniZineFoldState(progress, {
      w: this.w,
      h: this.h,
      panelThickness: this.panelThickness,
      stackDepthStep: this.stackDepthStep
    });
    this.debugFoldState = state;

    this.stacks.forEach((stack) => {
      const stackState = state.stacks[stack.index]; // ⚡️ Bolt: Optimize O(N) array search inside high-frequency animation loop using direct index lookup.
      if (!stackState) {
        return;
      }

      stack.group.position.set(
        stackState.pose.position.x,
        stackState.pose.position.y,
        stackState.pose.position.z
      );
      stack.group.rotation.set(
        stackState.pose.rotation.x,
        stackState.pose.rotation.y,
        stackState.pose.rotation.z,
        'XYZ'
      );
    });

    this.pages.forEach((page) => {
      const pageAngle = page.config.isTop ? state.topFoldAngle : -state.topFoldAngle;
      page.group.rotation.set(pageAngle, 0, 0, 'XYZ');
    });
    this.stacks.forEach((stack) => {
      stack.group.updateMatrixWorld(true);
    });

    this.updateSeams();
    this.updateGuides(state.stages.horizontalFold, state.stages.diamondOpen, state.stages.bookletClose);
    this.updateCameraForProgress(progress);
  }

  updateCameraForProgress(progress) {
    if (this.isFallbackMode || !this.camera || !this.controls) {
      return;
    }

    const bounds = this.debugFoldState?.bounds;
    if (!bounds) {
      return;
    }

    const center = {
      x: (bounds.min.x + bounds.max.x) / 2,
      y: (bounds.min.y + bounds.max.y) / 2,
      z: (bounds.min.z + bounds.max.z) / 2
    };
    const span = Math.max(
      bounds.max.x - bounds.min.x,
      bounds.max.y - bounds.min.y,
      bounds.max.z - bounds.min.z,
      1.6
    );
    const stage = Math.max(0, Math.min(3, progress));
    const yaw = -0.18 + (stage / 3) * 0.32;
    const lift = 0.25 + (stage / 3) * 0.35;
    const distance = Math.max(3.1, span * 1.38);

    this.cameraTarget.set(center.x, center.y * 0.35, center.z);
    this.camera.position.set(
      this.cameraTarget.x + Math.sin(yaw) * 0.7,
      this.cameraTarget.y + lift,
      this.cameraTarget.z + distance
    );
    this.controls.target.copy(this.cameraTarget);
    this.controls.update();
  }

  createSeams() {
    this.connectionDefinitions.forEach((connection) => {
      const from = connection.from;
      const to = connection.to;
      const orientation = connection.orientation;
      const geometry = new THREE.PlaneGeometry(1, 1);
      const material = new THREE.MeshStandardMaterial({
        color: this.sheetMaterialColor,
        side: THREE.DoubleSide,
        roughness: 0.95
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      const pageA = this.pages.find((page) => page.id === from);
      const pageB = this.pages.find((page) => page.id === to);
      this.seams.push({ from, to, orientation, mesh, geometry, material, pageA, pageB });
    });
  }

  createGuides() {
    this.guideDefinitions.forEach((guide) => {
      if (guide.type === 'slit') {
        const slitGuide = this.createSlitGuide(guide);
        this.scene.add(slitGuide.mesh);
        this.guides.push(slitGuide);
        return;
      }

      const isHorizontal = guide.orientation === 'horizontal';
      const geometry = new THREE.PlaneGeometry(
        isHorizontal ? guide.length : this.guideWidth,
        isHorizontal ? this.guideWidth : guide.length
      );
      const material = new THREE.MeshBasicMaterial({
        color: guide.type === 'slit' ? this.slitGuideColor : this.foldGuideColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: guide.type === 'slit' ? 0.8 : 0.45
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(guide.x, guide.y, this.panelThickness * 2);
      this.scene.add(mesh);
      this.guides.push({
        ...guide,
        mesh,
        geometry,
        material,
        geometries: [geometry],
        materials: [material]
      });
    });
  }

  createSlitGuide(guide) {
    const group = new THREE.Group();
    const lineGeometry = new THREE.PlaneGeometry(guide.length, this.cutGuideWidth);
    const capGeometry = new THREE.PlaneGeometry(this.cutGuideWidth * 1.15, this.cutGuideCapHeight);
    const lineMaterial = new THREE.MeshBasicMaterial({
      color: this.slitGuideColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95
    });
    const capMaterial = new THREE.MeshBasicMaterial({
      color: this.slitGuideColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95
    });

    const lineMesh = new THREE.Mesh(lineGeometry, lineMaterial);
    const leftCap = new THREE.Mesh(capGeometry, capMaterial);
    const rightCap = new THREE.Mesh(capGeometry, capMaterial);
    leftCap.position.x = -guide.length / 2;
    rightCap.position.x = guide.length / 2;

    group.add(lineMesh);
    group.add(leftCap);
    group.add(rightCap);
    group.position.set(guide.x, guide.y, this.panelThickness * 2.5);

    return {
      ...guide,
      mesh: group,
      lineMesh,
      endCaps: [leftCap, rightCap],
      geometries: [lineGeometry, capGeometry],
      materials: [lineMaterial, capMaterial]
    };
  }

  updateSeams() {
    const getPage = (id) => this.pages[id - 1]; void getPage; // ⚡️ Bolt: Optimize O(N) array search inside high-frequency animation loop using direct index lookup.

    const getAverageNormal = (pageA, pageB) => {
      const normalA = this.tmpVecC.set(0, 0, 1).applyQuaternion(pageA.group.quaternion);
      const normalB = this.tmpVecD.set(0, 0, 1).applyQuaternion(pageB.group.quaternion);
      return normalA.add(normalB).normalize();
    };

    this.seams.forEach((seam) => {
      const pageA = seam.pageA;
      const pageB = seam.pageB;
      if (!pageA || !pageB) { return; }

      const startLocal = seam.orientation === 'horizontal'
        ? new THREE.Vector3(this.w / 2, 0, 0)
        : new THREE.Vector3(0, -this.h / 2, 0);
      const endLocal = seam.orientation === 'horizontal'
        ? new THREE.Vector3(-this.w / 2, 0, 0)
        : new THREE.Vector3(0, this.h / 2, 0);

      const startWorld = pageA.group.localToWorld(startLocal);
      const endWorld = pageB.group.localToWorld(endLocal);
      const midpoint = startWorld.clone().add(endWorld).multiplyScalar(0.5);
      const tangent = endWorld.clone().sub(startWorld);
      const length = tangent.length();
      const maxGap = seam.orientation === 'horizontal'
        ? this.w * 0.9
        : this.h * 0.25;

      if (length < 1e-4 || length > maxGap) {
        seam.mesh.visible = false;
        return;
      }

      seam.mesh.visible = true;
      tangent.normalize();

      const normal = getAverageNormal(pageA, pageB);
      const bitangent = new THREE.Vector3().crossVectors(normal, tangent).normalize();
      const correctedNormal = new THREE.Vector3().crossVectors(tangent, bitangent).normalize();

      this.tmpMat.makeBasis(tangent, bitangent, correctedNormal);
      seam.mesh.setRotationFromMatrix(this.tmpMat);
      seam.mesh.position.copy(midpoint);
      seam.mesh.scale.set(length, this.seamWidth, 1);
    });
  }

  updateGuides(horizontalFold, diamondOpen, bookletClose) {
    const foldFade = Math.max(0, 1 - Math.max(horizontalFold * 0.7, diamondOpen * 0.8, bookletClose));
    const slitFade = Math.max(0.12, 1 - (bookletClose * 0.88));

    this.guides.forEach((guide) => {
      if (guide.type === 'slit') {
        guide.mesh.visible = slitFade > 0.02;
        guide.materials?.forEach((material) => {
          material.opacity = 0.95 * slitFade;
        });

        const slitSpread = 1 + (diamondOpen * 0.12);
        guide.lineMesh.scale.set(slitSpread, 1 + (horizontalFold * 0.08), 1);
        const endOffset = (guide.length * slitSpread) / 2;
        guide.endCaps?.[0]?.position.setX(-endOffset);
        guide.endCaps?.[1]?.position.setX(endOffset);
      } else {
        guide.mesh.visible = foldFade > 0.02;
        guide.material.opacity = 0.45 * foldFade;
        guide.mesh.scale.set(1, 1, 1);
      }
    });
  }

  animate() {
    if (this.isFallbackMode) {
      return;
    }

    this.animationId = requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onWindowResize);
    if (this.fallbackCanvas?.parentNode === this.container) {
      this.container.removeChild(this.fallbackCanvas);
    }
    if (this.isFallbackMode) {
      this.fallbackCanvas = null;
      this.fallbackContext = null;
      this.fallbackPages = [];
      return;
    }
    if (this.renderer?.domElement?.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
    this.pages.forEach((page) => {
      page.frontMaterial?.map?.dispose?.();
      page.frontMaterial?.dispose?.();
      page.backMaterial?.dispose?.();
      page.frontGeometry?.dispose?.();
      page.backGeometry?.dispose?.();
    });
    this.stacks = [];
    this.seams.forEach((seam) => {
      seam.material?.dispose?.();
      seam.geometry?.dispose?.();
    });
    this.guides.forEach((guide) => {
      (guide.materials ?? [guide.material]).forEach((material) => material?.dispose?.());
      (guide.geometries ?? [guide.geometry]).forEach((geometry) => geometry?.dispose?.());
    });
    this.renderer.dispose();
    this.environmentMeshes.forEach(({ geometry, material }) => {
      geometry?.dispose?.();
      material?.dispose?.();
    });
  }
}

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MINI_ZINE_STACKS, computeMiniZineFoldState } from '../utils/miniZineFold.js';

function normalizePreviewPage(page) {
  if (!page || typeof page === 'string') {
    const src = page || null;
    return {
      sourceUrl: src,
      previewUrl: src
    };
  }

  return {
    ...page,
    sourceUrl: page.sourceUrl ?? page.previewUrl ?? page.src ?? null,
    previewUrl: page.previewUrl ?? page.sourceUrl ?? page.src ?? null
  };
}

export class Zine3DViewer {
  constructor(containerElement) {
    this.container = containerElement;
    this.pages = [];
    this.stacks = [];
    this.seams = [];
    this.guides = [];
    this.w = 1.0;
    this.h = 1.414; // A-series proportion
    this.panelThickness = 0.002;
    this.stackDepthStep = 0.008;
    this.seamWidth = 0.035;
    this.guideWidth = 0.015;
    this.tmpVecC = new THREE.Vector3();
    this.tmpVecD = new THREE.Vector3();
    this.tmpMat = new THREE.Matrix4();
    this.sheetMaterialColor = 0xf4f1ea;
    this.foldGuideColor = 0xb8b8b8;
    this.slitGuideColor = 0x8f8f8f;
    
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
    
    this.initScene();
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#1a1a1a');

    const initialWidth = this.container.clientWidth || 1;
    const initialHeight = this.container.clientHeight || 1;
    this.camera = new THREE.PerspectiveCamera(45, initialWidth / initialHeight, 0.1, 100);
    this.camera.position.set(0, 0, 5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(initialWidth, initialHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(2, 5, 3);
    this.scene.add(dirLight);
    
    const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
    backLight.position.set(-2, -5, -3);
    this.scene.add(backLight);

    // Resize handler
    this.onWindowResize = () => this.refreshLayout();
    window.addEventListener('resize', this.onWindowResize);

    this.animate();
  }

  /**
   * Initializes or updates the page textures.
   * @param {Array} imageUrls - Array of 8 image URLs (blob URLs or data URIs)
   */
  loadPages(imageUrls) {
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
      guide.material?.dispose?.();
      guide.geometry?.dispose?.();
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

      const stack = this.stacks.find((entry) => entry.index === config.stackIndex);
      const group = new THREE.Group();
      const frontGeometry = new THREE.PlaneGeometry(this.w, this.h, 4, 4);
      const backGeometry = new THREE.PlaneGeometry(this.w, this.h, 1, 1);

      let frontMaterial;
      if (url) {
        const texture = textureLoader.load(url);
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
      frontMesh.position.z = this.panelThickness;
      frontMesh.position.y = config.isTop ? this.h / 2 : -this.h / 2;

      const backMesh = new THREE.Mesh(backGeometry, backMaterial);
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
    this.camera.position.set(0, 0, 6);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
    this.refreshLayout();
  }

  refreshLayout() {
    const width = this.container.clientWidth || 1;
    const height = this.container.clientHeight || 1;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  }

  /**
   * progressed folded state 0 to 3
   * The mini-zine is formed by folding lengthwise, opening the center slit
   * into the diamond/plus shape, then closing the booklet.
   * @param {number} progress  0=flat, 1=lengthwise fold, 2=diamond open, 3=closed booklet
   */
  setFoldProgress(progress) {
    const state = computeMiniZineFoldState(progress, {
      w: this.w,
      h: this.h,
      panelThickness: this.panelThickness,
      stackDepthStep: this.stackDepthStep
    });
    this.debugFoldState = state;

    this.stacks.forEach((stack) => {
      const stackState = state.stacks.find((entry) => entry.index === stack.index);
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
      page.group.rotation.set(page.config.isTop ? state.topFoldAngle : 0, 0, 0, 'XYZ');
    });
    this.stacks.forEach((stack) => {
      stack.group.updateMatrixWorld(true);
    });

    this.updateSeams();
    this.updateGuides(state.stages.horizontalFold, state.stages.diamondOpen, state.stages.bookletClose);
  }

  createSeams() {
    this.connectionDefinitions.forEach(({ from, to, orientation }) => {
      const geometry = new THREE.PlaneGeometry(1, 1);
      const material = new THREE.MeshStandardMaterial({
        color: this.sheetMaterialColor,
        side: THREE.DoubleSide,
        roughness: 0.95
      });
      const mesh = new THREE.Mesh(geometry, material);
      this.scene.add(mesh);
      this.seams.push({ from, to, orientation, mesh, geometry, material });
    });
  }

  createGuides() {
    this.guideDefinitions.forEach((guide) => {
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
      this.guides.push({ ...guide, mesh, geometry, material });
    });
  }

  updateSeams() {
    const getPage = (id) => this.pages.find((page) => page.id === id);

    const getAverageNormal = (pageA, pageB) => {
      const normalA = this.tmpVecC.set(0, 0, 1).applyQuaternion(pageA.group.quaternion);
      const normalB = this.tmpVecD.set(0, 0, 1).applyQuaternion(pageB.group.quaternion);
      return normalA.add(normalB).normalize();
    };

    this.seams.forEach((seam) => {
      const pageA = getPage(seam.from);
      const pageB = getPage(seam.to);
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
    const fade = Math.max(0, 1 - Math.max(horizontalFold * 0.7, diamondOpen * 0.8, bookletClose));

    this.guides.forEach((guide) => {
      guide.mesh.visible = fade > 0.02;
      guide.material.opacity = (guide.type === 'slit' ? 0.8 : 0.45) * fade;

      if (guide.type === 'slit') {
        const slitSpread = 1 + (diamondOpen * 0.12);
        guide.mesh.scale.set(slitSpread, 1, 1);
      } else {
        guide.mesh.scale.set(1, 1, 1);
      }
    });
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onWindowResize);
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
      guide.material?.dispose?.();
      guide.geometry?.dispose?.();
    });
    this.renderer.dispose();
  }
}

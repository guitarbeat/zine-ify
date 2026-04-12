import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class Zine3DViewer {
  constructor(containerElement) {
    this.container = containerElement;
    this.pages = [];
    this.seams = [];
    this.guides = [];
    this.w = 1.0;
    this.h = 1.414; // A-series proportion
    this.panelThickness = 0.002;
    this.seamWidth = 0.035;
    this.guideWidth = 0.015;
    this.tmpVecA = new THREE.Vector3();
    this.tmpVecB = new THREE.Vector3();
    this.tmpVecC = new THREE.Vector3();
    this.tmpVecD = new THREE.Vector3();
    this.tmpMat = new THREE.Matrix4();
    this.sheetMaterialColor = 0xf4f1ea;
    this.foldGuideColor = 0xb8b8b8;
    this.slitGuideColor = 0x8f8f8f;
    
    this.panelDefinitions = {
      1: { col: 3, isTop: false, zOrder: 7 }, // Cover
      2: { col: 3, isTop: true,  zOrder: 6 }, // Inside cover
      3: { col: 2, isTop: true,  zOrder: 5 },
      4: { col: 1, isTop: true,  zOrder: 4 },
      5: { col: 0, isTop: true,  zOrder: 3 },
      6: { col: 0, isTop: false, zOrder: 2 },
      7: { col: 1, isTop: false, zOrder: 1 },
      8: { col: 2, isTop: false, zOrder: 0 }  // Back cover
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
      { type: 'slit', orientation: 'horizontal', x: -0.5 * this.w, y: 0, length: this.w },
      { type: 'slit', orientation: 'horizontal', x: 0.5 * this.w, y: 0, length: this.w }
    ];
    
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
    // Clear existing planes
    this.pages.forEach((page) => {
      this.scene.remove(page.group);
      page.frontMaterial?.map?.dispose?.();
      page.frontMaterial?.dispose?.();
      page.backMaterial?.dispose?.();
      page.frontGeometry?.dispose?.();
      page.backGeometry?.dispose?.();
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
    this.seams = [];
    this.guides = [];

    const textureLoader = new THREE.TextureLoader();
    
    for (let i = 1; i <= 8; i++) {
      const config = this.panelDefinitions[i];
      const url = imageUrls[i - 1]; // Array is 0-indexed

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
        side: THREE.FrontSide,
        roughness: 0.95
      });

      const frontMesh = new THREE.Mesh(frontGeometry, frontMaterial);
      frontMesh.position.z = this.panelThickness;

      const backMesh = new THREE.Mesh(backGeometry, backMaterial);
      backMesh.rotation.y = Math.PI;
      backMesh.position.z = -this.panelThickness;

      group.add(frontMesh);
      group.add(backMesh);
      this.scene.add(group);
      
      this.pages.push({
        id: i,
        group,
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
   * The mini-zine is formed by folding lengthwise, opening the center slit,
   * and then closing the resulting booklet around its spine.
   * @param {number} progress  0=flat, 1=lengthwise fold, 2=slit collapse, 3=closed booklet
   */
  setFoldProgress(progress) {
    const horizontalFold = Math.max(0, Math.min(1, progress));
    const slitCollapse = Math.max(0, Math.min(1, progress - 1));
    const bookletClose = Math.max(0, Math.min(1, progress - 2));
    const w = this.w;
    const h = this.h;

    const rotateAroundY = (x, z, hingeX, angle) => {
      const dx = x - hingeX;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      return {
        x: hingeX + (dx * cosA),
        z: z - (dx * sinA)
      };
    };

    const rotateAroundX = (y, z, hingeY, angle) => {
      const dy = y - hingeY;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      return {
        y: hingeY + (dy * cosA),
        z: z + (dy * sinA)
      };
    };

    this.pages.forEach(page => {
      const { group, config } = page;
      
      // Initial flat coordinate centers
      let x = (config.col - 1.5) * w;
      let y = config.isTop ? 0.5 * h : -0.5 * h;
      let z = 0;
      
      let rx = 0;
      let ry = 0;
      const rz = 0;

      // 1. Fold lengthwise first so the slit can open.
      if (config.isTop) {
        const horizontalAngle = -horizontalFold * Math.PI;
        ({ y, z } = rotateAroundX(y, z, 0, horizontalAngle));
        rx += horizontalAngle;
      }

      // 2. Pinch the sheet inward so the slit opens and the pages collapse into spreads.
      let verticalAngle = 0;
      let hingeX = 0;
      if (config.col === 0) {
        verticalAngle = slitCollapse * Math.PI;
        hingeX = -w;
      } else if (config.col === 1) {
        verticalAngle = slitCollapse * Math.PI;
        hingeX = 0;
      } else if (config.col === 2) {
        verticalAngle = -slitCollapse * Math.PI;
        hingeX = 0;
      } else if (config.col === 3) {
        verticalAngle = -slitCollapse * Math.PI;
        hingeX = w;
      }

      ({ x, z } = rotateAroundY(x, z, hingeX, verticalAngle));
      ry += verticalAngle;

      // 3. Close the booklet around the spine so both halves participate.
      if (bookletClose > 0) {
        const closeDirection = x < 0 ? 1 : -1;
        const closeAngle = closeDirection * bookletClose * (Math.PI / 2);
        ({ x, z } = rotateAroundY(x, z, 0, closeAngle));
        ry += closeAngle;

        const depthShift = (config.zOrder - 3.5) * 0.004;
        z += depthShift * (1 + bookletClose);
      }

      group.position.set(x, y, z);
      group.rotation.set(rx, ry, rz, 'YXZ');
    });

    this.pages.forEach((page) => page.group.updateMatrixWorld(true));
    this.updateSeams();
    this.updateGuides(horizontalFold, slitCollapse, bookletClose);
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

      if (length < 1e-4) {
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

  updateGuides(horizontalFold, slitCollapse, bookletClose) {
    const fade = Math.max(0, 1 - Math.max(horizontalFold * 0.7, slitCollapse, bookletClose));

    this.guides.forEach((guide) => {
      guide.mesh.visible = fade > 0.02;
      guide.material.opacity = (guide.type === 'slit' ? 0.8 : 0.45) * fade;

      if (guide.type === 'slit') {
        const slitSpread = 1 + (slitCollapse * 0.18);
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

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class Zine3DViewer {
  constructor(containerElement) {
    this.container = containerElement;
    this.pages = [];
    this.w = 1.0;
    this.h = 1.414; // A-series proportion
    this.panelThickness = 0.002;
    
    // Page configuration mapped to a 4x2 grid
    this.pagesConfig = {
      1: { col: 3, isTop: false, zOrder: 7 }, // Cover
      2: { col: 3, isTop: true,  zOrder: 6 }, // Inside cover
      3: { col: 2, isTop: true,  zOrder: 5 },
      4: { col: 1, isTop: true,  zOrder: 4 },
      5: { col: 0, isTop: true,  zOrder: 3 },
      6: { col: 0, isTop: false, zOrder: 2 },
      7: { col: 1, isTop: false, zOrder: 1 },
      8: { col: 2, isTop: false, zOrder: 0 }  // Back cover
    };
    
    this.initScene();
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#1a1a1a');

    this.camera = new THREE.PerspectiveCamera(45, this.container.clientWidth / this.container.clientHeight, 0.1, 100);
    this.camera.position.set(0, 0, 5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
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
    this.onWindowResize = () => {
      this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    };
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
    this.pages = [];

    const textureLoader = new THREE.TextureLoader();
    
    for (let i = 1; i <= 8; i++) {
      const config = this.pagesConfig[i];
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
        color: 0xf4f1ea,
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

    // Initialize layout flat
    this.setFoldProgress(0);
    
    // Automatically adjust camera slightly so the flat sheet fits
    this.camera.position.set(0, 0, 6);
    this.controls.target.set(0, 0, 0);
  }

  /**
   * progressed folded state 0 to 3
   * @param {number} progress  0=flat, 1=hotdog, 2=cross, 3=closed
   */
  setFoldProgress(progress) {
    const centerAndQuarter = Math.max(0, Math.min(1, progress));
    const horizontalFold = Math.max(0, Math.min(1, progress - 1));
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

      // 1. Vertical folds first: center/quarter folds collapse columns into two booklet panels.
      let verticalAngle = 0;
      let hingeX = 0;
      if (config.col === 0) {
        verticalAngle = centerAndQuarter * Math.PI;
        hingeX = -w;
      } else if (config.col === 1) {
        verticalAngle = centerAndQuarter * Math.PI;
        hingeX = 0;
      } else if (config.col === 2) {
        verticalAngle = -centerAndQuarter * Math.PI;
        hingeX = 0;
      } else if (config.col === 3) {
        verticalAngle = -centerAndQuarter * Math.PI;
        hingeX = w;
      }

      ({ x, z } = rotateAroundY(x, z, hingeX, verticalAngle));
      ry += verticalAngle;

      // 2. Fold the top strip down over the bottom strip along the center slit/fold axis.
      if (config.isTop) {
        const horizontalAngle = -horizontalFold * Math.PI;
        ({ y, z } = rotateAroundX(y, z, 0, horizontalAngle));
        rx += horizontalAngle;
      }

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
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onWindowResize);
    this.container.removeChild(this.renderer.domElement);
    this.pages.forEach((page) => {
      page.frontMaterial?.map?.dispose?.();
      page.frontMaterial?.dispose?.();
      page.backMaterial?.dispose?.();
      page.frontGeometry?.dispose?.();
      page.backGeometry?.dispose?.();
    });
    this.renderer.dispose();
  }
}

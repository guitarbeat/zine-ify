import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class Zine3DViewer {
  constructor(containerElement) {
    this.container = containerElement;
    this.pages = [];
    this.w = 1.0;
    this.h = 1.414; // A-series proportion
    
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
    this.pages.forEach(p => this.scene.remove(p.mesh));
    this.pages = [];

    const textureLoader = new THREE.TextureLoader();
    
    for (let i = 1; i <= 8; i++) {
      const config = this.pagesConfig[i];
      const url = imageUrls[i - 1]; // Array is 0-indexed
      
      const geometry = new THREE.PlaneGeometry(this.w, this.h, 4, 4);
      
      let material;
      if (url) {
        const texture = textureLoader.load(url);
        // Fix rotation for top row pages directly in UVs or material
        if (config.isTop) {
          texture.center.set(0.5, 0.5);
          texture.rotation = Math.PI;
        }
        material = new THREE.MeshStandardMaterial({ 
          map: texture, 
          side: THREE.DoubleSide,
          roughness: 0.8
        });
      } else {
        material = new THREE.MeshStandardMaterial({ 
          color: 0xffffff, 
          side: THREE.DoubleSide,
          roughness: 0.8
        });
      }

      const mesh = new THREE.Mesh(geometry, material);
      this.scene.add(mesh);
      
      this.pages.push({
        id: i,
        mesh,
        config
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
    const hotdog = Math.max(0, Math.min(1, progress));
    const cross = Math.max(0, Math.min(1, progress - 1));
    const close = Math.max(0, Math.min(1, progress - 2));

    const theta = cross * Math.PI / 2;
    const closeAngle = close * Math.PI;
    const w = this.w;
    const h = this.h;
    
    // Used to gently push planes apart when closed to avoid z-fighting
    const gap = 0.005;

    this.pages.forEach(page => {
      const { mesh, config } = page;
      
      // Initial flat coordinate centers
      let x = (config.col - 1.5) * w;
      let y = config.isTop ? 0.5 * h : -0.5 * h;
      let z = 0;
      
      let rx = 0;
      let ry = 0;
      const rz = 0;

      // 1. Hotdog Fold (rotates top row around X axis at y=0)
      if (config.isTop) {
        const currentY = y;
        const angle = hotdog * Math.PI;
        y = currentY * Math.cos(angle);
        z = currentY * Math.sin(angle);
        rx += angle;
      }

      // 2. Cross Fold (pop out)
      if (config.col === 0) { // Left wings
        const hingeX = -w * Math.cos(theta); 
        x = hingeX - 0.5 * w;
      } else if (config.col === 3) { // Right wings
        const hingeX = w * Math.cos(theta);
        x = hingeX + 0.5 * w;
      } else if (config.col === 1) { // Center Left
        const hingeX = -w * Math.cos(theta);
        const dir = config.isTop ? -1 : 1; 
        const popZ = dir * w * Math.sin(theta);
        
        x = hingeX / 2; 
        z += popZ / 2;
        ry += dir * -theta; 
      } else if (config.col === 2) { // Center Right
        const hingeX = w * Math.cos(theta);
        const dir = config.isTop ? -1 : 1;
        const popZ = dir * w * Math.sin(theta);
        
        x = hingeX / 2;
        z += popZ / 2;
        ry += dir * theta;
      }

      // 3. Close Fold
      if (close > 0) {
        let pivotAngle = 0;
        if (config.col === 0) {pivotAngle = closeAngle;} else if (config.col === 1 && !config.isTop) {pivotAngle = closeAngle / 2;} else if (config.col === 1 && config.isTop) {pivotAngle = -closeAngle / 2;} else if (config.col === 2 && !config.isTop) {pivotAngle = closeAngle / 2;} else if (config.col === 2 && config.isTop) {pivotAngle = -closeAngle / 2;} 
        
        const cosA = Math.cos(pivotAngle);
        const sinA = Math.sin(pivotAngle);
        const nx = x * cosA + z * sinA;
        const nz = -x * sinA + z * cosA;
        x = nx;
        z = nz;
        ry += pivotAngle;
        
        // Z-fight prevention 
        // Shift planes slightly along their normal based on depth sorting
        // config.zOrder is 0 for back cover, 7 for front cover
        // shift goes from -gap*3.5 to +gap*3.5
        const depthShift = (config.zOrder - 3.5) * gap * close;
        z += depthShift;
      }

      mesh.position.set(x, y, z);
      mesh.rotation.set(rx, ry, rz, 'YXZ');
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
    this.renderer.dispose();
  }
}

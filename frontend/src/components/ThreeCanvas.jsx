import React, { useRef, useEffect, useState } from 'react';

// Utility: detect mobile / low-power devices
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isSmallScreen = window.innerWidth < 768;
  return isMobile || isSmallScreen;
};

const ThreeCanvas = () => {
  const containerRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

  useEffect(() => {
    if (!containerRef.current || isMobile) return;

    // Lazy-load Three.js
    let cleanup = null;

    const initScene = async () => {
      const THREE = await import('three');

      if (!containerRef.current) return;

      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      const scene = new THREE.Scene();

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      camera.position.z = 8;

      // OPTIMIZATION: Disable antialias, use low-power
      const renderer = new THREE.WebGLRenderer({ 
        antialias: false, 
        alpha: true,
        powerPreference: 'low-power'
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      containerRef.current.appendChild(renderer.domElement);

      const mainGroup = new THREE.Group();
      scene.add(mainGroup);

      // T-Shirt Shape
      const shirtShape = new THREE.Shape();
      shirtShape.moveTo(-0.5, 1.5);
      shirtShape.lineTo(0.5, 1.5);
      shirtShape.lineTo(1.0, 1.2);
      shirtShape.lineTo(1.8, 1.2);
      shirtShape.lineTo(2.0, 0.6);
      shirtShape.lineTo(1.4, 0.3);
      shirtShape.lineTo(1.2, 0.6);
      shirtShape.lineTo(1.1, -1.5);
      shirtShape.lineTo(-1.1, -1.5);
      shirtShape.lineTo(-1.2, 0.6);
      shirtShape.lineTo(-1.4, 0.3);
      shirtShape.lineTo(-2.0, 0.6);
      shirtShape.lineTo(-1.8, 1.2);
      shirtShape.lineTo(-1.0, 1.2);
      shirtShape.lineTo(-0.5, 1.5);

      const extrudeSettings = {
        depth: 0.2,
        steps: 1,
        bevelEnabled: true,
        bevelThickness: 0.1,
        bevelSize: 0.05,
        bevelOffset: 0,
        bevelSegments: 2 // Reduced from 4
      };

      const shirtGeometry = new THREE.ExtrudeGeometry(shirtShape, extrudeSettings);
      shirtGeometry.center();

      // OPTIMIZATION: Use MeshStandardMaterial instead of MeshPhysicalMaterial
      // MeshPhysicalMaterial with transmission is extremely GPU-heavy
      const shirtMaterial = new THREE.MeshStandardMaterial({
        color: 0xa855f7,
        emissive: 0x1b003a,
        roughness: 0.3,
        metalness: 0.2,
        transparent: true,
        opacity: 0.85,
        side: THREE.FrontSide // FrontSide only instead of DoubleSide
      });

      const shirtMesh = new THREE.Mesh(shirtGeometry, shirtMaterial);
      shirtMesh.scale.set(1.2, 1.2, 1.2);
      mainGroup.add(shirtMesh);

      // Wireframe overlay
      const wireframeGeom = new THREE.WireframeGeometry(shirtGeometry);
      const wireframeMat = new THREE.LineBasicMaterial({
        color: 0x06b6d4,
        transparent: true,
        opacity: 0.4
      });
      const wireframeLine = new THREE.LineSegments(wireframeGeom, wireframeMat);
      wireframeLine.scale.set(1.205, 1.205, 1.205);
      mainGroup.add(wireframeLine);

      // Hanger
      const hangerGroup = new THREE.Group();
      
      const rodGeom = new THREE.CylinderGeometry(0.04, 0.04, 3, 6); // Reduced segments from 8
      const hangerMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.2 });
      const rodMesh = new THREE.Mesh(rodGeom, hangerMat);
      rodMesh.rotation.z = Math.PI / 2;
      rodMesh.position.y = 1.6;
      hangerGroup.add(rodMesh);

      const hookGeom = new THREE.TorusGeometry(0.4, 0.04, 6, 16, Math.PI * 1.2); // Reduced segments
      const hookMesh = new THREE.Mesh(hookGeom, hangerMat);
      hookMesh.position.set(0, 2.0, 0);
      hookMesh.rotation.z = -Math.PI / 3;
      hangerGroup.add(hookMesh);

      mainGroup.add(hangerGroup);

      // OPTIMIZATION: Reduce floating particles from 120 to 50
      const particlesGeom = new THREE.BufferGeometry();
      const particlesCount = 50;
      const posArray = new Float32Array(particlesCount * 3);

      for (let i = 0; i < particlesCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 12;
      }

      particlesGeom.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
      
      const particlesMat = new THREE.PointsMaterial({
        size: 0.04,
        color: 0x06b6d4,
        transparent: true,
        opacity: 0.7
      });

      const particlesMesh = new THREE.Points(particlesGeom, particlesMat);
      scene.add(particlesMesh);

      // OPTIMIZATION: Fewer lights, reduced range
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
      scene.add(ambientLight);

      const pointLight1 = new THREE.PointLight(0xa855f7, 2, 30);
      pointLight1.position.set(3, 3, 5);
      scene.add(pointLight1);

      const pointLight2 = new THREE.PointLight(0x06b6d4, 2, 30);
      pointLight2.position.set(-3, -3, 5);
      scene.add(pointLight2);

      // Removed directional light (3 lights total is enough)

      // Interaction state
      let isDragging = false;
      let previousMousePosition = { x: 0, y: 0 };
      let targetRotationX = 0;
      let targetRotationY = 0;

      const handleMouseDown = (e) => {
        isDragging = true;
        previousMousePosition = { x: e.clientX, y: e.clientY };
      };

      const handleMouseMove = (e) => {
        if (!isDragging) return;

        const deltaMove = {
          x: e.clientX - previousMousePosition.x,
          y: e.clientY - previousMousePosition.y
        };

        targetRotationY += deltaMove.x * 0.007;
        targetRotationX += deltaMove.y * 0.007;
        targetRotationX = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, targetRotationX));

        previousMousePosition = { x: e.clientX, y: e.clientY };
      };

      const handleMouseUp = () => {
        isDragging = false;
      };

      const container = containerRef.current;
      container.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      // Animation Loop
      const clock = new THREE.Clock();
      let animId = null;

      const animate = () => {
        animId = requestAnimationFrame(animate);

        const elapsedTime = clock.getElapsedTime();

        if (!isDragging) {
          targetRotationY += 0.005;
          mainGroup.position.y = Math.sin(elapsedTime * 1.5) * 0.15;
          mainGroup.rotation.z = Math.sin(elapsedTime) * 0.05;
        }

        mainGroup.rotation.y += (targetRotationY - mainGroup.rotation.y) * 0.08;
        mainGroup.rotation.x += (targetRotationX - mainGroup.rotation.x) * 0.08;

        particlesMesh.rotation.y = elapsedTime * 0.05;
        particlesMesh.rotation.x = elapsedTime * 0.02;

        renderer.render(scene, camera);
      };

      animate();

      const handleResize = () => {
        if (!containerRef.current) return;
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;

        camera.aspect = w / h;
        camera.updateProjectionMatrix();

        renderer.setSize(w, h);
      };

      window.addEventListener('resize', handleResize);

      // Cleanup
      cleanup = () => {
        cancelAnimationFrame(animId);
        window.removeEventListener('resize', handleResize);
        container.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        
        if (renderer.domElement && container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
        
        shirtGeometry.dispose();
        shirtMaterial.dispose();
        wireframeGeom.dispose();
        wireframeMat.dispose();
        rodGeom.dispose();
        hookGeom.dispose();
        hangerMat.dispose();
        particlesGeom.dispose();
        particlesMat.dispose();
        renderer.dispose();
      };
    };

    initScene();

    return () => {
      if (cleanup) cleanup();
    };
  }, [isMobile]);

  // MOBILE FALLBACK: Show a lightweight static/CSS-animated 3D preview
  if (isMobile) {
    return (
      <div className="showcase-3d-container">
        <div className="visualizer-overlay">
          <h4>Model Pratinjau 3D</h4>
          <p>Glow Varsity Polinela</p>
        </div>
        
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle at center, #13131d 0%, #08080c 100%)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* CSS-only animated T-shirt silhouette for mobile */}
          <div className="mobile-3d-placeholder">
            <svg viewBox="0 0 200 200" width="180" height="180" style={{ opacity: 0.7 }}>
              <defs>
                <linearGradient id="shirtGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="blur"/>
                  <feMerge>
                    <feMergeNode in="blur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              {/* T-shirt shape */}
              <path 
                d="M70 40 L90 40 L100 30 L110 40 L130 40 L140 55 L130 60 L125 50 L125 150 L75 150 L75 50 L70 60 L60 55 Z" 
                fill="none" 
                stroke="url(#shirtGrad)" 
                strokeWidth="1.5"
                filter="url(#glow)"
                opacity="0.8"
              />
              {/* Hanger hook */}
              <path
                d="M95 30 Q100 15 105 30"
                fill="none"
                stroke="#cccccc"
                strokeWidth="2"
                opacity="0.6"
              />
              <line x1="100" y1="15" x2="100" y2="5" stroke="#cccccc" strokeWidth="2" opacity="0.6"/>
            </svg>
          </div>

          {/* Floating dots animation (CSS only, very lightweight) */}
          <div className="mobile-particles">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="mobile-particle" style={{
                left: `${15 + Math.random() * 70}%`,
                top: `${15 + Math.random() * 70}%`,
                animationDelay: `${i * 0.4}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}/>
            ))}
          </div>
        </div>

        <div className="visualizer-badge-3d">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
          Pratinjau Visual
        </div>
      </div>
    );
  }

  return (
    <div className="showcase-3d-container">
      <div className="visualizer-overlay">
        <h4>Model Pratinjau 3D</h4>
        <p>Glow Varsity Polinela</p>
      </div>
      
      <div ref={containerRef} className="canvas-3d" />

      <div className="visualizer-badge-3d">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
        Geser untuk memutar
      </div>
    </div>
  );
};

export default ThreeCanvas;

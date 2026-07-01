import React, { useRef, useEffect, useState } from 'react';

// Utility: detect mobile / low-power devices
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isSmallScreen = window.innerWidth < 768;
  const isLowMemory = navigator.deviceMemory && navigator.deviceMemory <= 4;
  const isSlowCPU = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
  return isMobile || isSmallScreen || isLowMemory || isSlowCPU;
};

const Background3D = () => {
  const mountRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

  useEffect(() => {
    // On mobile: skip the entire 3D background to save GPU/battery
    if (isMobile || !mountRef.current) return;

    // Lazy-load Three.js only when needed (desktop)
    let cleanup = null;

    const initScene = async () => {
      const THREE = await import('three');

      if (!mountRef.current) return;

      let width = window.innerWidth;
      let height = window.innerHeight;

      const scene = new THREE.Scene();

      const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 100);
      camera.position.z = 15;

      // OPTIMIZATION: Disable antialias, lower pixel ratio
      const renderer = new THREE.WebGLRenderer({ 
        antialias: false, 
        alpha: true,
        powerPreference: 'low-power'
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      mountRef.current.appendChild(renderer.domElement);

      // OPTIMIZATION: Reduce particle count significantly
      const particlesCount = 150;
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particlesCount * 3);
      const colors = new Float32Array(particlesCount * 3);

      const colorPurple = new THREE.Color('#a855f7');
      const colorCyan = new THREE.Color('#06b6d4');
      const colorPink = new THREE.Color('#ec4899');

      for (let i = 0; i < particlesCount * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 40;
        positions[i + 1] = (Math.random() - 0.5) * 40;
        positions[i + 2] = (Math.random() - 0.5) * 30;

        const rand = Math.random();
        let mixedColor;
        if (rand < 0.33) {
          mixedColor = colorPurple;
        } else if (rand < 0.66) {
          mixedColor = colorCyan;
        } else {
          mixedColor = colorPink;
        }

        colors[i] = mixedColor.r;
        colors[i + 1] = mixedColor.g;
        colors[i + 2] = mixedColor.b;
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const material = new THREE.PointsMaterial({
        size: 0.12,
        vertexColors: true,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const particles = new THREE.Points(geometry, material);
      scene.add(particles);

      // OPTIMIZATION: Use simple MeshStandardMaterial instead of MeshPhysicalMaterial
      // MeshPhysicalMaterial with transmission requires extra render pass = very heavy
      const shapesGroup = new THREE.Group();
      scene.add(shapesGroup);

      const shapesList = [];
      const geometries = [
        new THREE.IcosahedronGeometry(1.5, 0), // Lower detail (detail 0 vs 1)
        new THREE.TorusGeometry(1.2, 0.3, 8, 30), // Reduced segments (8,30 vs 16,60)
        new THREE.OctahedronGeometry(1.2, 0)
      ];

      // OPTIMIZATION: Simple transparent material instead of glass/transmission
      const meshMaterial = new THREE.MeshStandardMaterial({
        color: 0xa855f7,
        roughness: 0.3,
        metalness: 0.6,
        transparent: true,
        opacity: 0.12,
        side: THREE.FrontSide // FrontSide only vs DoubleSide
      });

      // OPTIMIZATION: Reduce from 5 shapes to 3
      for (let i = 0; i < 3; i++) {
        const geom = geometries[i % geometries.length];
        const mesh = new THREE.Mesh(geom, meshMaterial);
        
        mesh.position.set(
          (Math.random() - 0.5) * 28,
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 10 - 5
        );
        
        const scale = 0.5 + Math.random() * 0.8;
        mesh.scale.set(scale, scale, scale);
        
        mesh.userData = {
          rotationSpeedX: (Math.random() - 0.5) * 0.005,
          rotationSpeedY: (Math.random() - 0.5) * 0.005,
          floatSpeed: 0.2 + Math.random() * 0.5,
          floatOffset: Math.random() * Math.PI * 2,
          baseY: mesh.position.y
        };

        shapesGroup.add(mesh);
        shapesList.push(mesh);
      }

      // OPTIMIZATION: Fewer lights, reduced intensity
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);

      const light1 = new THREE.PointLight(0xa855f7, 3, 25);
      light1.position.set(10, 10, 10);
      scene.add(light1);

      const light2 = new THREE.PointLight(0x06b6d4, 3, 25);
      light2.position.set(-10, -10, 10);
      scene.add(light2);

      // Mouse parallax
      let mouseX = 0;
      let mouseY = 0;
      let targetMouseX = 0;
      let targetMouseY = 0;

      const handleMouseMove = (event) => {
        targetMouseX = (event.clientX / width - 0.5) * 4;
        targetMouseY = (event.clientY / height - 0.5) * 4;
      };

      window.addEventListener('mousemove', handleMouseMove);

      // OPTIMIZATION: Throttle to ~30fps instead of 60fps
      const clock = new THREE.Clock();
      let animId;
      let lastFrameTime = 0;
      const frameInterval = 1000 / 30; // 30fps cap

      const animate = (currentTime) => {
        animId = requestAnimationFrame(animate);
        
        // Throttle frame rate
        if (currentTime - lastFrameTime < frameInterval) return;
        lastFrameTime = currentTime;

        const elapsedTime = clock.getElapsedTime();

        mouseX += (targetMouseX - mouseX) * 0.05;
        mouseY += (targetMouseY - mouseY) * 0.05;

        camera.position.x = mouseX;
        camera.position.y = -mouseY;
        camera.lookAt(scene.position);

        particles.rotation.y = elapsedTime * 0.015;
        particles.rotation.x = elapsedTime * 0.005;

        shapesList.forEach((mesh) => {
          mesh.rotation.x += mesh.userData.rotationSpeedX;
          mesh.rotation.y += mesh.userData.rotationSpeedY;
          mesh.position.y = mesh.userData.baseY + Math.sin(elapsedTime * mesh.userData.floatSpeed + mesh.userData.floatOffset) * 0.8;
        });

        renderer.render(scene, camera);
      };

      animate(0);

      const handleResize = () => {
        width = window.innerWidth;
        height = window.innerHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      };

      window.addEventListener('resize', handleResize);

      // Store cleanup function
      cleanup = () => {
        cancelAnimationFrame(animId);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('resize', handleResize);
        
        if (mountRef.current && renderer.domElement && mountRef.current.contains(renderer.domElement)) {
          mountRef.current.removeChild(renderer.domElement);
        }
        
        geometry.dispose();
        material.dispose();
        geometries.forEach(g => g.dispose());
        meshMaterial.dispose();
        renderer.dispose();
      };
    };

    initScene();

    return () => {
      if (cleanup) cleanup();
    };
  }, [isMobile]);

  // On mobile: render a lightweight CSS-only animated background instead
  if (isMobile) {
    return (
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: -2,
          pointerEvents: 'none',
          overflow: 'hidden',
          background: 'radial-gradient(ellipse at 30% 20%, rgba(168, 85, 247, 0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(6, 182, 212, 0.06) 0%, transparent 50%)'
        }}
      />
    );
  }

  return (
    <div 
      ref={mountRef} 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -2,
        pointerEvents: 'none',
        overflow: 'hidden'
      }}
    />
  );
};

export default Background3D;

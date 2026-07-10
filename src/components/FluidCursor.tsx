import React, { useEffect, useRef } from 'react';

interface FluidCursorProps {
  enabled?: boolean;
  densityDissipation?: number; // kept for prop compatibility
  velocityDissipation?: number; // kept for prop compatibility
  pressure?: number;            // kept for prop compatibility
  curl?: number;                // kept for prop compatibility
  splatRadius?: number;         // kept for prop compatibility
  splatForce?: number;          // kept for prop compatibility
  transparent?: boolean;        // kept for prop compatibility
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
}

const PALETTE = [
  '139, 92, 246', // Purple (#8b5cf6)
  '236, 72, 153', // Pink (#ec4899)
  '6, 182, 212',  // Cyan (#06b6d4)
];

export const FluidCursor: React.FC<FluidCursorProps> = ({
  enabled = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const mousePos = useRef({ x: 0, y: 0 });
  const isFirstMove = useRef(true);

  useEffect(() => {
    if (!enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    // Handle canvas resizing
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Mouse events
    const handleMouseMove = (e: MouseEvent) => {
      if (isFirstMove.current) {
        lastMousePos.current = { x: e.clientX, y: e.clientY };
        mousePos.current = { x: e.clientX, y: e.clientY };
        isFirstMove.current = false;
        return;
      }
      mousePos.current = { x: e.clientX, y: e.clientY };
    };

    // Touch events for mobile support
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const touch = e.touches[0];
      if (isFirstMove.current) {
        lastMousePos.current = { x: touch.clientX, y: touch.clientY };
        mousePos.current = { x: touch.clientX, y: touch.clientY };
        isFirstMove.current = false;
        return;
      }
      mousePos.current = { x: touch.clientX, y: touch.clientY };
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    // Main animation loop
    const render = () => {
      time += 0.05;
      
      // Calculate mouse speed
      const dx = mousePos.current.x - lastMousePos.current.x;
      const dy = mousePos.current.y - lastMousePos.current.y;
      const speed = Math.sqrt(dx * dx + dy * dy);

      // Inject new particles if mouse is moving
      if (speed > 0.5) {
        // Number of particles is proportional to mouse speed
        const count = Math.min(6, Math.floor(speed / 2) + 1);
        for (let i = 0; i < count; i++) {
          const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
          const size = Math.random() * 25 + 15; // Soft fluid blobs size
          particlesRef.current.push({
            x: mousePos.current.x + (Math.random() - 0.5) * 10,
            y: mousePos.current.y + (Math.random() - 0.5) * 10,
            vx: dx * 0.15 + (Math.random() - 0.5) * 1.5,
            vy: dy * 0.15 + (Math.random() - 0.5) * 1.5,
            size,
            color,
            alpha: 0.65,
            decay: Math.random() * 0.012 + 0.008, // fade out speed
          });
        }
      }

      // Update last mouse position
      lastMousePos.current = { ...mousePos.current };

      // Clear screen
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      // Enable additive blending for glowing neon effects
      ctx.globalCompositeOperation = 'screen';

      // Update and draw particles
      particlesRef.current = particlesRef.current.filter((p) => {
        // 1. Friction / Viscosity
        p.vx *= 0.94;
        p.vy *= 0.94;

        // 2. Swirling / Turbulence simulation (Fluid curl/vortices)
        const curlX = Math.sin(p.y * 0.015 + time) * 0.25;
        const curlY = Math.cos(p.x * 0.015 + time) * 0.25;
        p.vx += curlX;
        p.vy += curlY;

        // 3. Move position
        p.x += p.vx;
        p.y += p.vy;

        // 4. Shrink/diffuse size
        p.size *= 0.975;
        
        // 5. Fade out
        p.alpha -= p.decay;

        if (p.alpha <= 0 || p.size <= 2) return false;

        // 6. Draw radial glow gradient
        try {
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          grad.addColorStop(0, `rgba(${p.color}, ${p.alpha})`);
          grad.addColorStop(0.3, `rgba(${p.color}, ${p.alpha * 0.4})`);
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } catch (e) {
          // ignore gradient errors
        }

        return true;
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      cancelAnimationFrame(animationId);
    };
  }, [enabled]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9999,
        display: enabled ? 'block' : 'none',
      }}
    />
  );
};

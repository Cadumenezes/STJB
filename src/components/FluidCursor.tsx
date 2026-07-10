import React, { useEffect, useRef } from 'react';
// @ts-ignore
import WebGLFluid from 'webgl-fluid';

interface FluidCursorProps {
  enabled?: boolean;
  densityDissipation?: number;
  velocityDissipation?: number;
  pressure?: number;
  curl?: number;
  splatRadius?: number;
  splatForce?: number;
  transparent?: boolean;
}

export const FluidCursor: React.FC<FluidCursorProps> = ({
  enabled = true,
  densityDissipation = 3.5,
  velocityDissipation = 2,
  pressure = 0.8,
  curl = 30,
  splatRadius = 0.25,
  splatForce = 6000,
  transparent = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simulationRef = useRef<any>(null);

  // 1. Initialize WebGL Fluid Simulation on canvas once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      simulationRef.current = WebGLFluid(canvas, {
        IMMEDIATE: true,
        TRIGGER: 'hover',
        SIM_RESOLUTION: 128,
        DYE_RESOLUTION: 512,
        CAPTURE_RESOLUTION: 256,
        DENSITY_DISSIPATION: 1 - (densityDissipation / 100),
        VELOCITY_DISSIPATION: 1 - (velocityDissipation / 100),
        PRESSURE: pressure,
        CURL: curl,
        SPLAT_RADIUS: splatRadius,
        SPLAT_FORCE: splatForce,
        SHADING: true,
        COLORFUL: true,
        COLOR_UPDATE_SPEED: 10,
        PAUSED: !enabled,
        BACK_COLOR: { r: 10, g: 10, b: 15 },
        TRANSPARENT: transparent,
        BLOOM: true,
        BLOOM_ITERATIONS: 4,
        BLOOM_RESOLUTION: 128,
        BLOOM_INTENSITY: 0.6,
        BLOOM_THRESHOLD: 0.8,
        SUNRAYS: false,
      });
    } catch (err) {
      console.error('Failed to initialize WebGL Fluid Simulation:', err);
    }

    return () => {
      if (simulationRef.current && typeof simulationRef.current.destroy === 'function') {
        try {
          simulationRef.current.destroy();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  // 2. Sync config updates when props change
  useEffect(() => {
    if (simulationRef.current) {
      try {
        simulationRef.current.config({
          PAUSED: !enabled,
          DENSITY_DISSIPATION: 1 - (densityDissipation / 100),
          VELOCITY_DISSIPATION: 1 - (velocityDissipation / 100),
          PRESSURE: pressure,
          CURL: curl,
          SPLAT_RADIUS: splatRadius,
          SPLAT_FORCE: splatForce,
        });
      } catch (err) {
        // ignore
      }
    }
  }, [enabled, densityDissipation, velocityDissipation, pressure, curl, splatRadius, splatForce]);

  // 3. Captures cursor and touch events on window and forwards them to the pointer-events: none canvas
  useEffect(() => {
    if (!enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const forwardMouseEvent = (type: string, e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;

      const event = new MouseEvent(type, {
        clientX: e.clientX,
        clientY: e.clientY,
        screenX: e.screenX,
        screenY: e.screenY,
        bubbles: true,
        cancelable: true,
        buttons: e.buttons,
      });

      Object.defineProperties(event, {
        offsetX: { value: offsetX },
        offsetY: { value: offsetY }
      });

      canvas.dispatchEvent(event);
    };

    const handleMouseMove = (e: MouseEvent) => forwardMouseEvent('mousemove', e);
    const handleMouseDown = (e: MouseEvent) => forwardMouseEvent('mousedown', e);
    const handleMouseUp = (e: MouseEvent) => forwardMouseEvent('mouseup', e);

    const forwardTouchEvent = (type: string, e: TouchEvent) => {
      // Touch events use pageX/pageY inside webgl-fluid
      const event = new TouchEvent(type, {
        touches: Array.from(e.touches),
        targetTouches: Array.from(e.targetTouches),
        changedTouches: Array.from(e.changedTouches),
        bubbles: true,
        cancelable: true,
      });
      canvas.dispatchEvent(event);
    };

    const handleTouchStart = (e: TouchEvent) => forwardTouchEvent('touchstart', e);
    const handleTouchMove = (e: TouchEvent) => forwardTouchEvent('touchmove', e);
    const handleTouchEnd = (e: TouchEvent) => forwardTouchEvent('touchend', e);

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mousedown', handleMouseDown, { passive: true });
    window.addEventListener('mouseup', handleMouseUp, { passive: true });

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);

      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
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
        zIndex: 9999, // Displays on top of background but behind clicks
        display: enabled ? 'block' : 'none',
      }}
    />
  );
};

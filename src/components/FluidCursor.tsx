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

  // 1. Initialize WebGL Fluid Simulation on canvas once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      WebGLFluid(canvas, {
        IMMEDIATE: false, // Turn off initial explosion
        SPLAT_COUNT: 0,   // Set initial splat count to 0
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
  }, []);

  // 2. Captures cursor and touch events on window and forwards them to the pointer-events: none canvas
  useEffect(() => {
    if (!enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const forwardMouseEvent = (type: string, e: MouseEvent) => {
      try {
        const rect = canvas.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        // Dispatch a plain Event instead of MouseEvent to prevent the browser from overriding offsetX/offsetY
        const event = new Event(type, {
          bubbles: true,
          cancelable: true,
        });

        // Define properties directly on the event object
        Object.defineProperties(event, {
          offsetX: { value: offsetX, writable: true, enumerable: true, configurable: true },
          offsetY: { value: offsetY, writable: true, enumerable: true, configurable: true },
          clientX: { value: e.clientX, writable: true, enumerable: true, configurable: true },
          clientY: { value: e.clientY, writable: true, enumerable: true, configurable: true },
          buttons: { value: e.buttons, writable: true, enumerable: true, configurable: true },
        });

        canvas.dispatchEvent(event);
      } catch (err) {
        console.error('Error forwarding mouse event to fluid canvas:', err);
      }
    };

    const handleMouseMove = (e: MouseEvent) => forwardMouseEvent('mousemove', e);
    const handleMouseDown = (e: MouseEvent) => forwardMouseEvent('mousedown', e);
    const handleMouseUp = (e: MouseEvent) => forwardMouseEvent('mouseup', e);

    const forwardTouchEvent = (type: string, e: TouchEvent) => {
      try {
        const event = new TouchEvent(type, {
          touches: Array.from(e.touches),
          targetTouches: Array.from(e.targetTouches),
          changedTouches: Array.from(e.changedTouches),
          bubbles: true,
          cancelable: true,
        });
        canvas.dispatchEvent(event);
      } catch (err) {
        console.error('Error forwarding touch event to fluid canvas:', err);
      }
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
        zIndex: 9999,
        display: enabled ? 'block' : 'none',
      }}
    />
  );
};

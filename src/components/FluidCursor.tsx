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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      // Initialize fluid simulation
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
        SUNRAYS: false, // Sunrays is heavy for cursor effects
      });
    } catch (err) {
      console.error('Failed to initialize WebGL Fluid Simulation:', err);
    }

    return () => {
      // Clean up WebGL context references if possible
      if (simulationRef.current && typeof simulationRef.current.destroy === 'function') {
        try {
          simulationRef.current.destroy();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  // Update simulation parameters dynamically when props change
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
        // ignore config updates if not supported
      }
    }
  }, [enabled, densityDissipation, velocityDissipation, pressure, curl, splatRadius, splatForce]);

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
        zIndex: 9999, // Displays on top of background but behind clicks due to pointerEvents: 'none'
        display: enabled ? 'block' : 'none',
      }}
    />
  );
};

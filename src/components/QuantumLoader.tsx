import { useEffect } from 'react'
import { quantum } from 'ldrs'


interface QuantumLoaderProps {
  size?: number | string;
  speed?: number | string;
  color?: string;
}

export default function QuantumLoader({ size = 45, speed = 1.75, color = 'var(--accent-color, #8b5cf6)' }: QuantumLoaderProps) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      quantum.register()
    }
  }, [])

  return (
    <l-quantum
      size={size.toString()}
      speed={speed.toString()}
      color={color}
    />
  )
}

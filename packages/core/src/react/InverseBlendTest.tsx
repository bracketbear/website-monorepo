import React from 'react';
import PointerFX from './PointerFX';

/**
 * Test component to verify inverse blend mode functionality
 */
const InverseBlendTest: React.FC = () => {
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      {/* Background with some content to test inverse effect */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'linear-gradient(45deg, #ff0000, #00ff00, #0000ff, #ffff00)',
        zIndex: 1
      }}>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '24px',
          color: 'white',
          textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
          textAlign: 'center'
        }}>
          <h1>Inverse Blend Mode Test</h1>
          <p>Move your mouse to see the inverse effect</p>
          <p>The particles should invert the background colors</p>
        </div>
      </div>

      {/* PointerFX with inverse blend enabled */}
      <PointerFX useInverseBlend={true} inverseIntensity={0.9} />
    </div>
  );
};

export default InverseBlendTest; 
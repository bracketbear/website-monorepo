import React, { useRef, useEffect } from 'react';
import * as PIXI from 'pixi.js';
import { InverseBlendFilter, SimpleInverseBlend, AdvancedInverseBlendFilter } from './InverseBlendFilter';

/**
 * Example component demonstrating different inverse blend modes
 */
const InverseBlendExample: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);

  useEffect(() => {
    let destroyed = false;
    (async () => {
      if (!containerRef.current) return;

      // Initialize PixiJS application
      const app = new PIXI.Application();
      await app.init({
        width: 800,
        height: 600,
        backgroundColor: 0x1099bb,
        antialias: true,
      });
      if (destroyed) return;

      containerRef.current.appendChild(app.canvas);
      appRef.current = app;

      // Create a background with some content
      const background = new PIXI.Container();
      
      // Add some colored rectangles as background
      const bgRect1 = new PIXI.Graphics()
        .rect(0, 0, 400, 300)
        .fill(0xff0000); // Red
      background.addChild(bgRect1);

      const bgRect2 = new PIXI.Graphics()
        .rect(400, 0, 400, 300)
        .fill(0x00ff00); // Green
      background.addChild(bgRect2);

      const bgRect3 = new PIXI.Graphics()
        .rect(0, 300, 400, 300)
        .fill(0x0000ff); // Blue
      background.addChild(bgRect3);

      const bgRect4 = new PIXI.Graphics()
        .rect(400, 300, 400, 300)
        .fill(0xffff00); // Yellow
      background.addChild(bgRect4);

      app.stage.addChild(background);

      // Example 1: Simple inverse blend using existing blend modes
      const simpleInverse = new PIXI.Graphics()
        .circle(200, 150, 50)
        .fill(0xffffff); // White circle
      SimpleInverseBlend.apply(simpleInverse);
      app.stage.addChild(simpleInverse);

      // Example 2: Advanced inverse blend filter with controllable intensity
      const advancedInverse = new PIXI.Graphics()
        .circle(600, 150, 50)
        .fill(0xffffff); // White circle
      
      const advancedFilter = new AdvancedInverseBlendFilter(0.8);
      advancedInverse.filters = [advancedFilter];
      app.stage.addChild(advancedInverse);

      // Example 3: Custom inverse blend filter (more complex)
      const customInverse = new PIXI.Graphics()
        .circle(200, 450, 50)
        .fill(0xffffff); // White circle
      
      // Note: This would require capturing the background texture
      // For now, we'll use a simpler approach
      const customFilter = new InverseBlendFilter();
      customInverse.filters = [customFilter];
      app.stage.addChild(customInverse);

      // Example 4: Animated inverse effect
      const animatedInverse = new PIXI.Graphics()
        .circle(600, 450, 50)
        .fill(0xffffff); // White circle
      
      const animatedFilter = new AdvancedInverseBlendFilter(0.5);
      animatedInverse.filters = [animatedFilter];
      app.stage.addChild(animatedInverse);

      // Animation loop for the animated inverse effect
      let time = 0;
      app.ticker.add(() => {
        time += 0.02;
        const intensity = 0.5 + 0.5 * Math.sin(time);
        animatedFilter.setIntensity(intensity);
      });

      // Add some text labels
      const createLabel = (text: string, x: number, y: number) => {
        const label = new PIXI.Text({
          text,
          style: {
            fontFamily: 'Arial',
            fontSize: 16,
            fill: 0xffffff,
            stroke: 0x000000,
            strokeThickness: 2,
          },
        });
        label.position.set(x - label.width / 2, y + 80);
        app.stage.addChild(label);
      };

      createLabel('Simple Inverse (Difference)', 200, 150);
      createLabel('Advanced Inverse (Filter)', 600, 150);
      createLabel('Custom Inverse (Filter)', 200, 450);
      createLabel('Animated Inverse', 600, 450);

      // Cleanup
      return () => {
        destroyed = true;
        if (appRef.current) {
          appRef.current.destroy(true);
          appRef.current = null;
        }
      };
    })();
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '800px',
        height: '600px',
        border: '1px solid #ccc',
        margin: '20px auto',
      }}
    />
  );
};

export default InverseBlendExample; 
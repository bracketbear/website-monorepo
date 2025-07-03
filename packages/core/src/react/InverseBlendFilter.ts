import { Filter, GlProgram, GpuProgram } from 'pixi.js';

/**
 * Custom inverse blend mode filter for PixiJS
 * This filter inverts the colors of the background behind the object
 */
export class InverseBlendFilter extends Filter {
  constructor() {
    const vertex = `
      attribute vec2 aPosition;
      varying vec2 vTextureCoord;

      uniform vec4 uInputSize;
      uniform vec4 uOutputFrame;
      uniform vec4 uOutputTexture;

      vec4 filterVertexPosition( void )
      {
          vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;

          position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
          position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;

          return vec4(position, 0.0, 1.0);
      }

      vec2 filterTextureCoord( void )
      {
          return aPosition * (uOutputFrame.zw * uInputSize.zw);
      }

      void main(void)
      {
          gl_Position = filterVertexPosition();
          vTextureCoord = filterTextureCoord();
      }
    `;

    const fragment = `
      varying vec2 vTextureCoord;

      uniform sampler2D uTexture;
      uniform sampler2D uBackgroundTexture;

      void main(void)
      {
          // Sample the current texture (foreground)
          vec4 fg = texture2D(uTexture, vTextureCoord);
          
          // Sample the background texture
          vec4 bg = texture2D(uBackgroundTexture, vTextureCoord);
          
          // Inverse blend: invert the background and blend with foreground
          vec4 invertedBg = vec4(1.0 - bg.rgb, bg.a);
          
          // Blend the inverted background with the foreground
          // This creates an inverse effect where dark becomes light and vice versa
          vec4 result = vec4(
              fg.rgb * (1.0 - invertedBg.a) + invertedBg.rgb * fg.a,
              fg.a + invertedBg.a * (1.0 - fg.a)
          );
          
          gl_FragColor = result;
      }
    `;

    // WebGPU fragment shader
    const gpuFragment = `
      @group(0) @binding(0) var uTexture: texture_2d<f32>;
      @group(0) @binding(1) var uBackgroundTexture: texture_2d<f32>;
      @group(0) @binding(2) var uSampler: sampler;

      @fragment
      fn mainFragment(@location(0) vTextureCoord: vec2<f32>) -> @location(0) vec4<f32> {
          // Sample the current texture (foreground)
          let fg = textureSample(uTexture, uSampler, vTextureCoord);
          
          // Sample the background texture
          let bg = textureSample(uBackgroundTexture, uSampler, vTextureCoord);
          
          // Inverse blend: invert the background and blend with foreground
          let invertedBg = vec4<f32>(1.0 - bg.rgb, bg.a);
          
          // Blend the inverted background with the foreground
          let result = vec4<f32>(
              fg.rgb * (1.0 - invertedBg.a) + invertedBg.rgb * fg.a,
              fg.a + invertedBg.a * (1.0 - fg.a)
          );
          
          return result;
      }
    `;

    super({
      glProgram: new GlProgram({
        fragment,
        vertex,
      }),
      gpuProgram: new GpuProgram({
        fragment: {
          entryPoint: 'mainFragment',
          source: gpuFragment,
        },
        vertex: {
          entryPoint: 'mainVert',
          source: vertex,
        },
      }),
      resources: {
        // We'll need to capture the background texture
        // This will be set when applying the filter
      },
    });
  }

  /**
   * Apply the inverse blend filter to a container
   * @param container The container to apply the filter to
   * @param backgroundTexture The background texture to invert
   */
  static applyToContainer(container: any, backgroundTexture?: any) {
    const filter = new InverseBlendFilter();

    if (backgroundTexture) {
      // Set the background texture as a resource
      filter.resources.uBackgroundTexture = backgroundTexture;
    }

    container.filters = [filter];
    return filter;
  }
}

/**
 * Alternative: Simple inverse blend mode using existing blend modes
 * This is more performant but less customizable
 */
export class SimpleInverseBlend {
  /**
   * Apply a simple inverse effect using difference blend mode
   * @param graphics The graphics object to apply the effect to
   */
  static apply(graphics: any) {
    // Use difference blend mode which creates an inverse-like effect
    graphics.blendMode = 'difference';

    // You can also combine with other blend modes for different effects
    // graphics.blendMode = 'exclusion'; // Alternative inverse-like effect
  }
}

/**
 * Advanced inverse blend with custom shader
 * This provides more control over the inverse effect
 */
export class AdvancedInverseBlendFilter extends Filter {
  constructor(intensity: number = 1.0) {
    const vertex = `
      attribute vec2 aPosition;
      varying vec2 vTextureCoord;

      uniform vec4 uInputSize;
      uniform vec4 uOutputFrame;
      uniform vec4 uOutputTexture;

      vec4 filterVertexPosition( void )
      {
          vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;

          position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
          position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;

          return vec4(position, 0.0, 1.0);
      }

      vec2 filterTextureCoord( void )
      {
          return aPosition * (uOutputFrame.zw * uInputSize.zw);
      }

      void main(void)
      {
          gl_Position = filterVertexPosition();
          vTextureCoord = filterTextureCoord();
      }
    `;

    const fragment = `
      varying vec2 vTextureCoord;

      uniform sampler2D uTexture;
      uniform float uIntensity;

      void main(void)
      {
          vec4 color = texture2D(uTexture, vTextureCoord);
          
          // Apply inverse effect with controllable intensity
          vec3 inverted = mix(color.rgb, 1.0 - color.rgb, uIntensity);
          
          gl_FragColor = vec4(inverted, color.a);
      }
    `;

    super({
      glProgram: new GlProgram({
        fragment,
        vertex,
      }),
      resources: {
        intensityUniforms: {
          uIntensity: { value: intensity, type: 'f32' },
        },
      },
    });
  }

  /**
   * Set the intensity of the inverse effect
   * @param intensity Value between 0.0 (no effect) and 1.0 (full inverse)
   */
  setIntensity(intensity: number) {
    this.resources.intensityUniforms.uniforms.uIntensity = Math.max(
      0.0,
      Math.min(1.0, intensity)
    );
  }
}

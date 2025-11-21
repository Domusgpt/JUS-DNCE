import { StylePreset } from "./types";

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'neon-cyber',
    name: 'Neon Cyberpunk',
    description: 'Glowing neon lights, dark tech aesthetic, high contrast.',
    promptModifier: 'cyberpunk style, neon lights, glowing edges, futuristic city atmosphere, dark background with vibrant cyan and magenta highlights. High contrast. Sharp details.',
    thumbnail: 'https://picsum.photos/id/132/100/100'
  },
  {
    id: 'retro-anime',
    name: 'Retro Anime (90s)',
    description: 'Vintage cel-shaded look, grain, VHS aesthetic.',
    promptModifier: '90s anime style, cel shaded, vhs glitch effect, retro aesthetic, lo-fi anime screenshot, hand drawn look.',
    thumbnail: 'https://picsum.photos/id/234/100/100'
  },
  {
    id: 'acid-glitch',
    name: 'Acid Glitch',
    description: 'Distorted visuals, chromatic aberration, digital noise.',
    promptModifier: 'glitch art, datamosh, chromatic aberration, distorted digital noise, acid colors, psychedelic, raw aesthetics.',
    thumbnail: 'https://picsum.photos/id/345/100/100'
  },
  {
    id: 'oil-painting',
    name: 'Dreamy Oil',
    description: 'Fluid strokes, vivid colors, Van Gogh inspired.',
    promptModifier: 'impasto oil painting, thick brush strokes, vivid colors, dreamy atmosphere, swirling patterns, expressionist art.',
    thumbnail: 'https://picsum.photos/id/456/100/100'
  }
];
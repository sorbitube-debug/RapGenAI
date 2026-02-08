
import { Plugin, BeatPlugin, FlowPlugin, EffectPlugin } from '../types';

class PluginRegistry {
  private plugins: Map<string, Plugin> = new Map();
  private activePlugins: Set<string> = new Set();

  constructor() {
    // Register some "Built-in" Marketplace Plugins as examples
    this.register({
      id: 'glitch-vox',
      name: 'Cyber Glitch Vox',
      author: 'RapGen Core',
      version: '1.0.0',
      description: 'Adds a rhythmic glitch/stutter effect to vocals.',
      category: 'effect',
      applyEffect: (ctx, source) => {
        const gain = ctx.createGain();
        const oscillator = ctx.createOscillator();
        oscillator.type = 'square';
        oscillator.frequency.value = 8; // 8Hz stutter
        oscillator.connect(gain.gain);
        oscillator.start();
        source.connect(gain);
        return gain;
      }
    });

    this.register({
      id: 'lofi-dust',
      name: 'Lo-Fi Dust',
      author: 'Vinyl Junkies',
      version: '1.2.0',
      description: 'Adds warm vinyl crackle and bit-reduction.',
      category: 'effect',
      applyEffect: (ctx, source) => {
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2500;
        source.connect(filter);
        return filter;
      }
    });

    this.register({
      id: 'rhyme-booster',
      name: 'Rhyme Density+',
      author: 'Flow Masters',
      version: '0.9.0',
      description: 'Forcefully injects more internal rhymes into generated lyrics.',
      category: 'flow',
      transformLyrics: (lyrics) => {
        // Logic to simulate more rhymes by adding rhythmic particles
        return lyrics.split('\n').map(l => l.length > 5 ? l + ' (آره)' : l).join('\n');
      }
    });
  }

  public register(plugin: Plugin) {
    this.plugins.set(plugin.id, plugin);
  }

  public togglePlugin(id: string) {
    if (this.activePlugins.has(id)) {
      this.activePlugins.delete(id);
    } else {
      this.activePlugins.add(id);
    }
  }

  public getPlugins() {
    return Array.from(this.plugins.values());
  }

  public getActivePlugins() {
    return Array.from(this.activePlugins).map(id => this.plugins.get(id)!);
  }

  public isPluginActive(id: string) {
    return this.activePlugins.has(id);
  }

  public applyFlowPlugins(lyrics: string): string {
    let result = lyrics;
    this.getActivePlugins().forEach(p => {
      if (p.category === 'flow') {
        result = p.transformLyrics(result);
      }
    });
    return result;
  }

  public applyEffectPlugins(ctx: AudioContext, source: AudioNode): AudioNode {
    let lastNode = source;
    this.getActivePlugins().forEach(p => {
      if (p.category === 'effect') {
        lastNode = p.applyEffect(ctx, lastNode);
      }
    });
    return lastNode;
  }
}

export const pluginRegistry = new PluginRegistry();

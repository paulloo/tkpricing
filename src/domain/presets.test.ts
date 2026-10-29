import { describe, expect, it } from 'vitest';
import { PRESETS, SITES, findPreset } from './presets';
import { shopConfigSchema } from './shop-config';

describe('PRESETS', () => {
  it.each(PRESETS.map((p) => [p.id, p] as const))('%s 通过配置校验', (_, preset) => {
    expect(() => shopConfigSchema.parse(preset.config)).not.toThrow();
  });

  it('每个站点都至少有一个预设，且币种一致', () => {
    for (const site of SITES) {
      const presets = PRESETS.filter((p) => p.site === site.code);
      expect(presets.length).toBeGreaterThan(0);
      presets.forEach((p) => expect(p.config.currency.sale).toBe(site.currency));
    }
  });

  it('预设 id 唯一', () => {
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(PRESETS.length);
    expect(findPreset(PRESETS[0].id)).toBe(PRESETS[0]);
  });

  it('已核对的预设必须注明来源', () => {
    PRESETS.filter((p) => p.verifiedAt).forEach((p) => expect(p.sources.length).toBeGreaterThan(0));
  });
});

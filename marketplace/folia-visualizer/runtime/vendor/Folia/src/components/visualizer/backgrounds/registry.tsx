import React from 'react';
import type { VisualizerBackgroundMode } from '../../../types';
import { DEFAULT_VISUALIZER_BACKGROUND_MODE } from '../../../types/visualizerModes';
import type { VisualizerBackgroundRegistryEntry } from './definition';
import FluidBackground from './common/FluidBackground';
import GeometricBackground from './common/GeometricBackground';
import LatentBackground from './latent/LatentBackground';
import MonetBackgroundLayer from './monet/MonetBackgroundLayer';
import NomandBackgroundLayer from './nomand/NomandBackgroundLayer';
import SoraBackground from './sora/SoraBackground';
import UrlBackgroundLayer from './url/UrlBackgroundLayer';

const entries: VisualizerBackgroundRegistryEntry[] = [
    { mode: 'common', order: 10, labelKey: 'options.visualizerBackgroundModeCommon', labelFallback: '通用', song: ({ config, coverUrl, seed, staticMode }) => [staticMode ? null : seed ?? null, config?.common?.useCoverColorBg ? coverUrl ?? null : null], render: ({ config, theme, coverUrl, audioPower, audioBands, seed, staticMode, paused }) => { const common = config?.common; const useCoverColorBg = common?.useCoverColorBg ?? false; return <>{useCoverColorBg && <div className="absolute inset-0 z-0"><FluidBackground coverUrl={coverUrl} theme={theme} /></div>}<div className="absolute inset-0 z-0 transition-all duration-1000" style={{ backgroundColor: theme.backgroundColor, opacity: useCoverColorBg ? common?.opacity ?? 0.75 : 1 }} />{!staticMode && <div className="absolute inset-0 z-0"><GeometricBackground theme={theme} audioPower={audioPower} audioBands={audioBands} seed={seed} hideShapes={common?.disableGeometricBackground ?? false} disableVignette={common?.disableVignette ?? false} paused={paused} /></div>}</>; } },
    { mode: 'monet', order: 20, labelKey: 'options.visualizerBackgroundModeMonet', labelFallback: '莫奈', render: ({ config, coverUrl, theme, isDaylight, staticMode }) => <MonetBackgroundLayer coverUrl={coverUrl} monetBackgroundImage={config?.customImage} theme={theme} isDaylight={isDaylight} tuning={config?.monet?.tuning} transparentBackground={config?.transparent} staticMode={staticMode} /> },
    { mode: 'nomand', order: 30, labelKey: 'options.visualizerBackgroundModeNomand', labelFallback: '漫游', render: ({ config, coverUrl, theme, isDaylight }) => <NomandBackgroundLayer coverUrl={coverUrl} monetBackgroundImage={config?.customImage} tuning={config?.nomand?.tuning} theme={theme} isDaylight={isDaylight} /> },
    { mode: 'latent', order: 35, labelKey: 'options.visualizerBackgroundModeLatent', labelFallback: '隐现', render: ({ config, theme, coverUrl, audioPower, audioBands, staticMode, paused, blendMs, blendProgress }) => <LatentBackground theme={theme} coverUrl={coverUrl} audioPower={audioPower} audioBands={audioBands} staticMode={staticMode} paused={paused} tuning={config?.latent?.tuning} blendMs={blendMs} blendProgress={blendProgress} /> },
    { mode: 'url', order: 40, labelKey: 'options.visualizerBackgroundModeUrl', labelFallback: '嵌入', render: ({ config }) => <UrlBackgroundLayer urlBackgroundList={config?.url?.items} urlBackgroundSelectedId={config?.url?.selectedId} /> },
    { mode: 'sora', order: 50, labelKey: 'options.visualizerBackgroundModeSora', labelFallback: '空', render: ({ config, theme, isDaylight, paused, staticMode, blendMs, blendProgress }) => <div className="absolute inset-0 z-0" style={{ backgroundColor: isDaylight ? '#ffffff' : '#000000' }}>{!config?.sora?.tuning?.blank && <SoraBackground theme={theme} isDaylight={isDaylight} paused={paused || staticMode} blendMs={blendMs} blendProgress={blendProgress} />}</div> },
];

const byMode: Partial<Record<VisualizerBackgroundMode, VisualizerBackgroundRegistryEntry>> = {};
entries.forEach(entry => { byMode[entry.mode] = entry; });
export const VISUALIZER_BACKGROUND_REGISTRY = [...entries].sort((left, right) => left.order - right.order);
export { DEFAULT_VISUALIZER_BACKGROUND_MODE };
export const hasVisualizerBackgroundMode = (mode: unknown): mode is VisualizerBackgroundMode => typeof mode === 'string' && Boolean(byMode[mode as VisualizerBackgroundMode]);
export const getVisualizerBackgroundRegistryEntry = (mode: VisualizerBackgroundMode) => byMode[mode] ?? byMode[DEFAULT_VISUALIZER_BACKGROUND_MODE]!;
export const getVisualizerBackgroundModeLabel = (mode: VisualizerBackgroundMode, t: (key: string) => string) => { const entry = getVisualizerBackgroundRegistryEntry(mode); const translated = t(entry.labelKey); return !translated || translated === entry.labelKey ? entry.labelFallback : translated; };
export const appendVisualizerBackgroundEntry = (entry: VisualizerBackgroundRegistryEntry): boolean => { if (byMode[entry.mode]) return false; byMode[entry.mode] = entry; VISUALIZER_BACKGROUND_REGISTRY.push(entry); VISUALIZER_BACKGROUND_REGISTRY.sort((left, right) => left.order - right.order); return true; };
export const removeVisualizerBackgroundEntry = (mode: VisualizerBackgroundMode): boolean => { if (!byMode[mode]) return false; delete byMode[mode]; const index = VISUALIZER_BACKGROUND_REGISTRY.findIndex(entry => entry.mode === mode); if (index >= 0) VISUALIZER_BACKGROUND_REGISTRY.splice(index, 1); return true; };

import React from 'react';
import type { VisualizerMode } from '../../types';
import { DEFAULT_VISUALIZER_MODE } from '../../types/visualizerModes';
import { type VisualizerRegistryEntry } from './definition';
import { fumeBackgroundConfig } from './fume/backgroundConfig';
import { nebbiaBackgroundConfig, nebbiaShowsBackground } from './nebbia/nebbiaBehind';
import hanabiTuning from './hanabi/tuning';
import machiTuning from './machi/tuning';
import nebbiaTuning from './nebbia/tuning';
import { DEFAULT_CADENZA_TUNING, DEFAULT_MONET_TUNING } from '../../types';

// Sparkle plugin port: Folia's visualizer registry without settings panels, commands or the
// mod contribution channel. The full built-in effect set is kept.
const VisualizerSonnet = React.lazy(() => import('./sonnet/VisualizerSonnet'));
const VisualizerTempera = React.lazy(() => import('./tempera/VisualizerTempera'));
const VisualizerLumiere = React.lazy(() => import('./lumiere/VisualizerLumiere'));
const VisualizerHanabi = React.lazy(() => import('./hanabi/VisualizerHanabi'));
const VisualizerMachi = React.lazy(() => import('./machi/VisualizerMachi'));
const VisualizerNebbia = React.lazy(() => import('./nebbia/VisualizerNebbia'));
const VisualizerClassic = React.lazy(() => import('./classic/Visualizer'));
const VisualizerCadenza = React.lazy(() => import('./cadenza/VisualizerCadenza'));
const VisualizerPartita = React.lazy(() => import('./partita/VisualizerPartita'));
const VisualizerFume = React.lazy(() => import('./fume/VisualizerFume'));
const VisualizerTilt = React.lazy(() => import('./tilt/VisualizerTilt'));
const VisualizerCladdagh = React.lazy(() => import('./claddagh/VisualizerCladdagh'));
const VisualizerMonet = React.lazy(() => import('./monet/VisualizerMonet'));
const VisualizerPendolo = React.lazy(() => import('./pendolo/VisualizerPendolo'));
const VisualizerCappella = React.lazy(() => import('./cappella/VisualizerCappella'));
const VisualizerDiorama = React.lazy(() => import('./diorama/VisualizerDiorama'));
const VisualizerStill = React.lazy(() => import('./still/VisualizerStill'));

const entries: VisualizerRegistryEntry[] = [
    { mode: 'sonnet', order: 10, labelKey: 'ui.visualizerSonnet', labelFallback: '商籁', previewSeed: 'sonnet', previewStartOffset: 0, usesWordSegmentation: true, render: props => <VisualizerSonnet {...props} /> },
    { mode: 'tempera', order: 20, labelKey: 'ui.visualizerTempera', labelFallback: '凝彩', previewSeed: 'tempera', previewStartOffset: 0, usesWordSegmentation: true, render: props => <VisualizerTempera {...props} /> },
    { mode: 'lumiere', order: 25, labelKey: 'ui.visualizerLumiere', labelFallback: '绘光', previewSeed: 'lumiere', previewStartOffset: 0, usesWordSegmentation: true, render: props => <VisualizerLumiere {...props} /> },
    { mode: 'hanabi', order: 26, labelKey: 'ui.visualizerHanabi', labelFallback: '花火', previewSeed: 'hanabi', previewStartOffset: 0, usesWordSegmentation: true, render: props => <VisualizerHanabi {...props} hanabiTuning={hanabiTuning.read(props.visualizerTunings)} /> },
    { mode: 'machi', order: 27, labelKey: 'ui.visualizerMachi', labelFallback: '町景', previewSeed: 'machi', previewStartOffset: 0, background: false, render: props => <VisualizerMachi {...props} machiTuning={machiTuning.read(props.visualizerTunings)} /> },
    { mode: 'nebbia', order: 29, labelKey: 'ui.visualizerNebbia', labelFallback: '雾笺', previewSeed: 'nebbia', previewStartOffset: 0, background: nebbiaBackgroundConfig, showsBackground: nebbiaShowsBackground, usesWordSegmentation: true, render: props => <VisualizerNebbia {...props} nebbiaTuning={nebbiaTuning.read(props.visualizerTunings)} /> },
    { mode: 'classic', order: 30, labelKey: 'ui.visualizerClassic', labelFallback: '流光', previewSeed: 'classic', previewStartOffset: 0, usesWordSegmentation: true, render: props => <VisualizerClassic {...props} /> },
    { mode: 'cadenza', order: 40, labelKey: 'ui.visualizerCadenze', labelFallback: '心象', previewSeed: 'cadenza', previewStartOffset: 0, render: ({ cadenzaTuning = DEFAULT_CADENZA_TUNING, lyricsFontScale = 1, ...props }) => <VisualizerCadenza {...props} lyricsFontScale={lyricsFontScale} cadenzaTuning={{ ...cadenzaTuning, fontScale: cadenzaTuning.fontScale * lyricsFontScale }} /> },
    { mode: 'partita', order: 50, labelKey: 'ui.visualizerPartita', labelFallback: '云阶', previewSeed: 'partita', previewStartOffset: 0, usesWordSegmentation: true, render: props => <VisualizerPartita {...props} /> },
    { mode: 'fume', order: 60, labelKey: 'ui.visualizerFume', labelFallback: '浮名', previewSeed: 'fume', previewStartOffset: 18.4, background: fumeBackgroundConfig, render: props => <VisualizerFume {...props} /> },
    { mode: 'tilt', order: 70, labelKey: 'ui.visualizerTilt', labelFallback: '倾诉', previewSeed: 'tilt', previewStartOffset: 0, render: props => <VisualizerTilt {...props} /> },
    { mode: 'claddagh', order: 80, labelKey: 'ui.visualizerCladdagh', labelFallback: '回环', previewSeed: 'claddagh', previewStartOffset: 0, render: props => <VisualizerCladdagh {...props} /> },
    { mode: 'monet', order: 90, labelKey: 'ui.visualizerMonet', labelFallback: '莫奈', previewSeed: 'monet', previewStartOffset: 0, seeksOnLineClick: true, followsSongHandoff: true, render: props => { const monetTuning = props.monetTuning ?? DEFAULT_MONET_TUNING; const lyricsFontScale = props.lyricsFontScale ?? 1; return <VisualizerMonet {...props} monetTuning={{ ...monetTuning, fontScale: monetTuning.fontScale * lyricsFontScale }} />; } },
    { mode: 'pendolo', order: 100, labelKey: 'ui.visualizerPendolo', labelFallback: '时计', previewSeed: 'pendolo', previewStartOffset: 0, seeksOnLineClick: true, render: props => <VisualizerPendolo key={props.seed} {...props} /> },
    { mode: 'cappella', order: 110, labelKey: 'ui.visualizerCappella', labelFallback: '群唱', previewSeed: 'cappella', previewStartOffset: 0, render: props => <VisualizerCappella {...props} /> },
    { mode: 'diorama', order: 120, labelKey: 'ui.visualizerDiorama', labelFallback: '镜台', previewSeed: 'diorama', previewStartOffset: 0, render: props => <VisualizerDiorama {...props} /> },
    { mode: 'still', order: 130, labelKey: 'ui.visualizerStill', labelFallback: '静止', previewSeed: 'still', previewStartOffset: 0, background: false, render: props => <VisualizerStill {...props} /> },
];

const byMode: Partial<Record<VisualizerMode, VisualizerRegistryEntry>> = {};
entries.forEach(entry => { byMode[entry.mode] = entry; });

export const VISUALIZER_REGISTRY = [...entries].sort((left, right) => left.order - right.order);
export { DEFAULT_VISUALIZER_MODE };
export const hasVisualizerMode = (mode: string | null | undefined): mode is VisualizerMode => Boolean(mode && byMode[mode as VisualizerMode]);
export const getVisualizerRegistryEntry = (mode: VisualizerMode) => byMode[mode] ?? byMode[DEFAULT_VISUALIZER_MODE]!;
export const getVisualizerModeLabel = (mode: VisualizerMode, t: (key: string) => string) => { const entry = getVisualizerRegistryEntry(mode); const translated = t(entry.labelKey); return !translated || translated === entry.labelKey ? entry.labelFallback : translated; };
export const getVisualizerPreviewStartOffset = (mode: VisualizerMode, loopDuration: number) => loopDuration <= 0 ? 0 : getVisualizerRegistryEntry(mode).previewStartOffset % loopDuration;
export const getVisualizerScopedSeed = (mode: VisualizerMode, scope: string) => `${scope}-${getVisualizerRegistryEntry(mode).previewSeed}`;
export const appendVisualizerEntry = (entry: VisualizerRegistryEntry): boolean => { if (byMode[entry.mode]) return false; byMode[entry.mode] = entry; VISUALIZER_REGISTRY.push(entry); VISUALIZER_REGISTRY.sort((left, right) => left.order - right.order); return true; };
export const removeVisualizerEntry = (mode: VisualizerMode): boolean => { if (!byMode[mode]) return false; delete byMode[mode]; const index = VISUALIZER_REGISTRY.findIndex(entry => entry.mode === mode); if (index >= 0) VISUALIZER_REGISTRY.splice(index, 1); return true; };
export type { VisualizerRegistryEntry, VisualizerSettingsPanelProps, VisualizerSharedProps } from './definition';

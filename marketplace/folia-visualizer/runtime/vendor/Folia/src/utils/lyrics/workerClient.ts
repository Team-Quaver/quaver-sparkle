// @ts-nocheck -- plugin port: the host parses lyrics before handing them to the visualizer.
import type { LyricData } from '../../types';
import type { LyricParseFormat } from './parserCore';
import type { LyricProcessingOptions } from './types';
export const toWorkerLyricProcessingOptions = (options?: LyricProcessingOptions) => options;
export const initLyricsWorker = (): Worker => { throw new Error('lyrics worker is not bundled in the visualizer plugin'); };
export const parseLyricsAsync = async (_format: LyricParseFormat, _content: string, _translation?: string, _options?: LyricProcessingOptions, _romanization?: string): Promise<LyricData | null> => null;

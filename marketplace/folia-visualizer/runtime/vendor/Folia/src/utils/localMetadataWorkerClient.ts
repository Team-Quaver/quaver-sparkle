// @ts-nocheck -- plugin port: local metadata parsing belongs to the host, not the visualizer.
export interface EmbeddedMetadataResult { title?: string; artist?: string; artists?: string[]; album?: string; trackNumber?: number; discNumber?: number; cover?: Blob; coverAssetId?: string; bitrate?: number; lyrics?: string; translationLyrics?: string; replayGain?: number; replayGainTrackGain?: number; replayGainTrackPeak?: number; replayGainAlbumGain?: number; replayGainAlbumPeak?: number; duration?: number; }
export interface HashedLocalCoverResult { cover: Blob; coverAssetId: string; }
export const initMetadataWorker = (): Worker => { throw new Error('metadata worker is not bundled in the visualizer plugin'); };
export const parseEmbeddedMetadataAsync = async (_file: File, _includeCover = false): Promise<EmbeddedMetadataResult | null> => null;
export const hashLocalCoverBlobAsync = async (_cover: Blob): Promise<HashedLocalCoverResult | null> => null;

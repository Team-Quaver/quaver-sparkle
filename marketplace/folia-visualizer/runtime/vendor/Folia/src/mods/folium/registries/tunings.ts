import { useSyncExternalStore } from 'react';
const EMPTY: Readonly<Record<string, number>> = Object.freeze({});
export const useFoliumTunings = (_target: string): Readonly<Record<string, number>> => useSyncExternalStore(() => () => {}, () => EMPTY, () => EMPTY);

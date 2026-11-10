// @ts-nocheck -- vendored Folia visualizer snapshot; checked in its upstream repository.
import {
    Star, Sparkles, Flower, Store, Umbrella, CloudRain, Moon, Sun, Cloud, Music, Heart,
    Disc3, Clock, Camera, Coffee, Bike, Car, Home, Building2, TrainFront, Ship, Plane,
    Droplets, Snowflake, Wind, Flame, Leaf, Cat, Fish, type IconNode, type LucideIcon,
} from 'lucide-react';

// Quaver plugin adaptation: the theme supplies no arbitrary icon names, so resolve the small
// built-in set synchronously instead of pulling lucide's whole dynamicIconImports table
// (thousands of one-icon chunks).
type LucideIconStatus = 'loading' | 'ready' | 'missing';

const ICONS: Record<string, LucideIcon> = {
    Star, Sparkles, Flower, Store, Umbrella, CloudRain, Moon, Sun, Cloud, Music, Heart,
    Disc3, Clock, Camera, Coffee, Bike, Car, Home, Building2, TrainFront, Ship, Plane,
    Droplets, Snowflake, Wind, Flame, Leaf, Cat, Fish,
};

const byName = new Map(Object.entries(ICONS));
const byLower = new Map(Object.keys(ICONS).map(name => [name.toLowerCase(), name]));
const listeners = new Set<() => void>();
let revision = 0;

const trimName = (name: unknown) => (typeof name === 'string' ? name.trim() : '');
const canonical = (name: string | null | undefined) => {
    const trimmed = trimName(name);
    return byName.has(trimmed) ? trimmed : byLower.get(trimmed.toLowerCase());
};

export const loadLucideIcons = async (names: readonly unknown[] | undefined): Promise<void> => {
    const requested = (names ?? []).map(trimName).filter(name => name && canonical(name));

    if (requested.length) {
        revision += 1;
        listeners.forEach(listener => listener());
    }
};

export const hasLucideIcon = async (name: string): Promise<boolean> => Boolean(canonical(name));

export const resolveLucideIcon = (name: string | null | undefined): LucideIcon | null => {
    const key = canonical(name);
    return key ? byName.get(key) ?? null : null;
};

export const resolveLucideIconNode = (name: string | null | undefined): IconNode | null => {
    const icon = resolveLucideIcon(name) as unknown as { render?: (props: object, ref: null) => unknown } | null;

    if (!icon || typeof icon.render !== 'function') return null;

    try {
        const element = icon.render({}, null) as { props?: { iconNode?: unknown; icon?: { node?: unknown } } } | null;
        const node = element?.props?.iconNode ?? element?.props?.icon?.node;
        return Array.isArray(node) ? node as IconNode : null;
    } catch {
        return null;
    }
};

export const getLucideIconStatus = (name: string | null | undefined): LucideIconStatus => (
    canonical(name) ? 'ready' : 'missing'
);

export const resolveLucideIconNames = (names: readonly string[] | undefined): string[] => [
    ...new Set((names ?? []).map(name => canonical(name)).filter((name): name is string => Boolean(name))),
];

export const subscribeLucideIcons = (listener: () => void) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
};

export const getLucideIconRevision = () => revision;

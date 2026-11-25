import React from 'react';

// Quaver plugin port: the kit's original tooltip portals into document.body, which escapes the
// plugin's shadow root (and its styles). The host already owns a self-drawn tooltip layer
// (ui/src/components/NativeDrop.ts) that reads `data-tooltip` and walks composed/shadow paths, so
// hand the text to it instead of drawing a bubble inside the shadow tree — a CSS bubble here
// inherits the width of whatever narrow control it is anchored to and wraps one character per line.
export const Tooltip: React.FC<{
    text?: string;
    className?: string;
    children: React.ReactNode;
}> = ({ text, className, children }) => (
    <span className={className} data-tooltip={text || undefined}>
        {children}
    </span>
);

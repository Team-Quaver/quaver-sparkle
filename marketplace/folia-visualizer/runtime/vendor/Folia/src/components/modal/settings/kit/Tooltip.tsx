import React from 'react';

// Quaver plugin port: the kit's original tooltip portals into document.body, which escapes the
// plugin's shadow root (and its styles). Draw it inside the shadow tree with CSS instead.
export const Tooltip: React.FC<{
    text?: string;
    className?: string;
    children: React.ReactNode;
}> = ({ text, className, children }) => (
    <span className={`fvr-tip${className ? ` ${className}` : ''}`}>
        {children}
        {text ? <span className="fvr-tip-label" role="tooltip">{text}</span> : null}
    </span>
);

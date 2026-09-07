"use client";

import React, { useState } from 'react';
import './Folder.css';

export interface FolderProps {
  color?: string;
  size?: number;
  items?: React.ReactNode[];
  className?: string;
  open?: boolean;
  onToggle?: (open: boolean) => void;
  interactive?: boolean;
}

export const darkenColor = (hex: string, percent: number): string => {
  let color = hex.startsWith('#') ? hex.slice(1) : hex;
  if (color.length === 3) {
    color = color
      .split('')
      .map(c => c + c)
      .join('');
  }
  const p = percent > 1 ? percent / 100 : percent;
  const num = parseInt(color.slice(0, 6), 16);
  if (Number.isNaN(num)) return hex;
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  r = Math.max(0, Math.min(255, Math.floor(r * (1 - p))));
  g = Math.max(0, Math.min(255, Math.floor(g * (1 - p))));
  b = Math.max(0, Math.min(255, Math.floor(b * (1 - p))));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
};

export default function Folder({
  color = '#5227FF',
  size = 1,
  items = [],
  className = '',
  open,
  onToggle,
  interactive = true,
}: FolderProps): React.JSX.Element {
  const maxItems = 3;
  const papers = (items || []).slice(0, maxItems);
  while (papers.length < maxItems) {
    papers.push(null);
  }

  const isControlled = open !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = isControlled ? open : internalOpen;

  const [paperOffsets, setPaperOffsets] = useState<{ x: number; y: number }[]>(
    Array.from({ length: maxItems }, () => ({ x: 0, y: 0 }))
  );

  const folderBackColor = darkenColor(color, 0.08);
  const paper1 = darkenColor('#ffffff', 0.1);
  const paper2 = darkenColor('#ffffff', 0.05);
  const paper3 = '#ffffff';

  const handleToggle = () => {
    if (!interactive) return;
    const nextOpen = !isOpen;
    if (!isControlled) {
      setInternalOpen(nextOpen);
    }
    onToggle?.(nextOpen);
    if (isOpen) {
      setPaperOffsets(Array.from({ length: maxItems }, () => ({ x: 0, y: 0 })));
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!interactive) return;
    e.stopPropagation();
    handleToggle();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!interactive) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      handleToggle();
    }
  };

  const handlePaperMouseMove = (e: React.MouseEvent<HTMLDivElement>, index: number) => {
    if (!isOpen) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const offsetX = (e.clientX - centerX) * 0.15;
    const offsetY = (e.clientY - centerY) * 0.15;
    setPaperOffsets(prev => {
      const newOffsets = [...prev];
      newOffsets[index] = { x: offsetX, y: offsetY };
      return newOffsets;
    });
  };

  const handlePaperMouseLeave = (index: number) => {
    setPaperOffsets(prev => {
      const newOffsets = [...prev];
      newOffsets[index] = { x: 0, y: 0 };
      return newOffsets;
    });
  };

  const folderStyle: React.CSSProperties = {
    '--folder-color': color,
    '--folder-back-color': folderBackColor,
    '--paper-1': paper1,
    '--paper-2': paper2,
    '--paper-3': paper3,
  } as React.CSSProperties;

  const folderClassName = [
    'folder',
    isOpen ? 'open' : '',
    !interactive ? 'non-interactive' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const scaleStyle: React.CSSProperties = {
    transform: `scale(${size})`,
    transformOrigin: 'center',
  };

  return (
    <div style={scaleStyle} className={`folder-container ${className}`.trim()}>
      <div
        className={folderClassName}
        style={folderStyle}
        onClick={interactive ? handleClick : undefined}
        onKeyDown={interactive ? handleKeyDown : undefined}
        tabIndex={interactive ? 0 : undefined}
        role={interactive ? 'button' : 'presentation'}
        aria-expanded={interactive ? isOpen : undefined}
        aria-label={interactive ? (isOpen ? 'Close folder' : 'Open folder') : undefined}
      >
        <div className="folder__back">
          {papers.map((item, i) => (
            <div
              key={i}
              className={`paper paper-${i + 1}`}
              onMouseMove={e => handlePaperMouseMove(e, i)}
              onMouseLeave={() => handlePaperMouseLeave(i)}
              style={
                isOpen
                  ? ({
                      '--magnet-x': `${paperOffsets[i]?.x || 0}px`,
                      '--magnet-y': `${paperOffsets[i]?.y || 0}px`,
                    } as React.CSSProperties)
                  : undefined
              }
            >
              {item}
            </div>
          ))}
          <div className="folder__front" />
          <div className="folder__front right" />
        </div>
      </div>
    </div>
  );
}

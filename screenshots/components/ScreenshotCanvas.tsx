'use client';

import React, { forwardRef } from 'react';

export interface ScreenshotCanvasHandle {
  element: HTMLDivElement | null;
}

interface ScreenshotCanvasProps {
  width: number;
  height: number;
  children: React.ReactNode;
}

const ScreenshotCanvas = forwardRef<ScreenshotCanvasHandle, ScreenshotCanvasProps>(
  ({ width, height, children }, ref) => {
    const divRef = React.useRef<HTMLDivElement>(null);

    React.useImperativeHandle(ref, () => ({
      element: divRef.current,
    }));

    return (
      <div
        ref={divRef}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          margin: 0,
          padding: 0,
          display: 'flex',
          overflow: 'hidden',
          background: 'white',
        }}
      >
        {children}
      </div>
    );
  }
);

ScreenshotCanvas.displayName = 'ScreenshotCanvas';

export default ScreenshotCanvas;

'use client';

import React, { useRef, useState } from 'react';
import { APPLE_SIZES, SLIDES, LANGUAGES, AppleSize, SlideNumber, Language } from '@/data/config';
import ScreenshotCanvas from '@/components/ScreenshotCanvas';
import Slide1Wallet from '@/components/slides/Slide1Wallet';
import Slide2Missions from '@/components/slides/Slide2Missions';
import Slide3Goals from '@/components/slides/Slide3Goals';
import Slide4ParentDash from '@/components/slides/Slide4ParentDash';
import Slide5Duo from '@/components/slides/Slide5Duo';
import Slide6CTA from '@/components/slides/Slide6CTA';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';

const slideComponents = [
  Slide1Wallet,
  Slide2Missions,
  Slide3Goals,
  Slide4ParentDash,
  Slide5Duo,
  Slide6CTA,
];

export default function Home() {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('fr');
  const [selectedSlide, setSelectedSlide] = useState<SlideNumber>(1);
  const [selectedSize, setSelectedSize] = useState<AppleSize>('6.1');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState('');
  const canvasRef = useRef<any>(null);

  const size = APPLE_SIZES[selectedSize];
  const SlideComponent = slideComponents[selectedSlide - 1];

  const exportCurrentSlide = async () => {
    if (!canvasRef.current?.element) return;

    try {
      const dataUrl = await toPng(canvasRef.current.element, {
        pixelRatio: 2,
        cacheBust: true,
      });

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `koiny-${selectedLanguage}-slide${selectedSlide}-${selectedSize}.png`;
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Check console.');
    }
  };

  const exportAll = async () => {
    setIsExporting(true);
    setExportProgress('Initializing ZIP...');
    const zip = new JSZip();
    const folders: { [key: string]: any } = {};

    try {
      let count = 0;
      const total = SLIDES.length * LANGUAGES.length * Object.keys(APPLE_SIZES).length;

      // Generate all screenshots
      for (const lang of LANGUAGES) {
        if (!folders[lang]) {
          folders[lang] = zip.folder(lang);
        }

        for (const slide of SLIDES) {
          for (const sizeKey of Object.keys(APPLE_SIZES) as AppleSize[]) {
            const s = APPLE_SIZES[sizeKey];
            count++;

            const progress = `Generating ${count}/${total}: ${lang} Slide ${slide} (${sizeKey}")`;
            setExportProgress(progress);
            console.log(progress);

            // Create a temporary canvas element
            const tempCanvas = document.createElement('div');
            tempCanvas.style.position = 'fixed';
            tempCanvas.style.left = '-9999px';
            tempCanvas.style.top = '-9999px';
            tempCanvas.style.zIndex = '-999';
            document.body.appendChild(tempCanvas);

            const SlideComp = slideComponents[slide - 1];

            // Create React element string and render it
            const tempDiv = document.createElement('div');
            tempDiv.style.width = `${s.width}px`;
            tempDiv.style.height = `${s.height}px`;
            tempDiv.style.margin = '0';
            tempDiv.style.padding = '0';
            tempDiv.style.display = 'flex';
            tempDiv.style.overflow = 'hidden';
            tempDiv.style.background = 'white';
            tempCanvas.appendChild(tempDiv);

            // Render the slide component
            const root = document.createElement('div');
            tempDiv.appendChild(root);

            // Use React.createElement approach
            const { createRoot } = await import('react-dom/client');
            const reactRoot = createRoot(root);
            
            await new Promise<void>((resolve) => {
              reactRoot.render(
                <ScreenshotCanvas width={s.width} height={s.height}>
                  <SlideComp language={lang} width={s.width} height={s.height} />
                </ScreenshotCanvas>
              );
              // Wait a moment for rendering
              setTimeout(resolve, 500);
            });

            // Export to PNG
            try {
              const dataUrl = await toPng(root.firstChild as HTMLElement, {
                pixelRatio: 2,
                cacheBust: true,
              });

              // Convert data URL to blob
              const response = await fetch(dataUrl);
              const blob = await response.blob();

              // Add to ZIP
              const filename = `slide${slide}-${sizeKey}.png`;
              folders[lang].file(filename, blob);
            } catch (renderError) {
              console.error(`Failed to render ${lang} slide ${slide}:`, renderError);
            }

            // Clean up
            document.body.removeChild(tempCanvas);
          }
        }
      }

      // Generate ZIP file
      setExportProgress('Generating ZIP file...');
      const blob = await zip.generateAsync({ type: 'blob' });

      // Download ZIP
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `koiny-app-store-screenshots-${new Date().toISOString().split('T')[0]}.zip`;
      link.click();

      setExportProgress('✅ Export complete! ZIP downloaded to Desktop.');
      setTimeout(() => setExportProgress(''), 3000);
    } catch (error) {
      console.error('Export all failed:', error);
      setExportProgress(`❌ Export failed: ${error}`);
      alert('Export failed. Check console for details.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🪙 Koiny App Store Screenshots
          </h1>
          <p className="text-gray-600 text-lg">
            Generate premium screenshots for App Store submission
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {/* Language */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Language
              </label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value as Language)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Slide */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Slide
              </label>
              <select
                value={selectedSlide}
                onChange={(e) => setSelectedSlide(Number(e.target.value) as SlideNumber)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {SLIDES.map((slide) => {
                  const labels = [
                    'Portefeuille',
                    'Missions',
                    'Objectifs',
                    'Dashboard Parent',
                    'Duo App',
                    'CTA',
                  ];
                  return (
                    <option key={slide} value={slide}>
                      Slide {slide}: {labels[slide - 1]}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Size */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Size
              </label>
              <select
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value as AppleSize)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {(Object.keys(APPLE_SIZES) as AppleSize[]).map((sizeKey) => {
                  const s = APPLE_SIZES[sizeKey];
                  return (
                    <option key={sizeKey} value={sizeKey}>
                      {sizeKey}&quot; ({s.width}×{s.height})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Buttons */}
            <div className="flex items-end gap-2">
              <button
                onClick={exportCurrentSlide}
                className="flex-1 px-4 py-2 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition"
              >
                ⬇️ Export
              </button>
              <button
                onClick={exportAll}
                disabled={isExporting}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {isExporting ? '⏳ Exporting...' : '📦 All'}
              </button>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            <p>
              📐 Resolution: <strong>{size.width}×{size.height}px</strong> ({selectedSize}&quot;
              screen)
            </p>
          </div>

          {/* Progress bar */}
          {exportProgress && (
            <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
              <p className="text-sm font-semibold text-indigo-700">{exportProgress}</p>
              {isExporting && (
                <div className="mt-2 w-full bg-indigo-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full animate-pulse"
                    style={{ width: '100%' }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="bg-white rounded-xl shadow-lg p-8 flex justify-center overflow-x-auto">
          <div className="inline-flex">
            <ScreenshotCanvas ref={canvasRef} width={size.width} height={size.height}>
              <SlideComponent language={selectedLanguage} width={size.width} height={size.height} />
            </ScreenshotCanvas>
          </div>
        </div>

        {/* Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-gray-700">
          <p className="font-semibold mb-2">ℹ️ Export Guide:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Select language, slide, and size for quick preview</li>
            <li>Click <strong>&quot;⬇️ Export&quot;</strong> to download current slide as PNG</li>
            <li>Click <strong>&quot;📦 All&quot;</strong> to generate all 72 screenshots as ZIP (takes 2-3 min)</li>
            <li>ZIP downloads to your Downloads folder (or Desktop depending on browser)</li>
            <li>Extract and organize by language (FR, NL, EN)</li>
            <li>Upload to App Store Connect</li>
          </ul>
        </div>
      </div>
    </main>
  );
}

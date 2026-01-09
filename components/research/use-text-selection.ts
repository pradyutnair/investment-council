'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export interface TextPosition {
  x: number;
  y: number;
}

export function useTextSelection(onAsk?: (text: string) => void) {
  const [selectedText, setSelectedText] = useState('');
  const [showAskButton, setShowAskButton] = useState(false);
  const [position, setPosition] = useState<TextPosition>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const isSelectingRef = useRef(false);

  const handleMouseUp = useCallback(() => {
    if (!containerRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setShowAskButton(false);
      setSelectedText('');
      return;
    }

    const text = selection.toString().trim();
    if (!text) {
      setShowAskButton(false);
      setSelectedText('');
      return;
    }

    // Check if selection is within our container
    const range = selection.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) {
      setShowAskButton(false);
      setSelectedText('');
      return;
    }

    // Only show for meaningful selections (at least 3 words or 15 chars)
    const words = text.split(/\s+/);
    if (words.length < 2 && text.length < 10) {
      setShowAskButton(false);
      setSelectedText('');
      return;
    }

    const rect = range.getBoundingClientRect();
    setPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    });

    setSelectedText(text);
    setShowAskButton(true);
  }, []);

  const handleAsk = useCallback(() => {
    if (selectedText && onAsk) {
      onAsk(selectedText);
    }
    // Clear selection after asking
    window.getSelection()?.removeAllRanges();
    setShowAskButton(false);
    setSelectedText('');
  }, [selectedText, onAsk]);

  const hideAskButton = useCallback(() => {
    // Don't hide immediately - let user click the button
    // Only hide if selection is cleared
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setShowAskButton(false);
      setSelectedText('');
    }
  }, []);

  // Handle mouse down to track selection state
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseDown = () => {
      isSelectingRef.current = true;
    };

    const handleMouseUpGlobal = () => {
      setTimeout(() => {
        isSelectingRef.current = false;
      }, 100);
    };

    container.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUpGlobal);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUpGlobal);
    };
  }, []);

  // Clear selection when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setShowAskButton(false);
        setSelectedText('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return {
    containerRef,
    selectedText,
    showAskButton,
    position,
    handleMouseUp,
    handleAsk,
    hideAskButton,
  };
}

'use client';

import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TextSelectionAskProps {
  show: boolean;
  position: { x: number; y: number };
  onAsk: () => void;
  onClose: () => void;
}

export function TextSelectionAsk({ show, position, onAsk, onClose }: TextSelectionAskProps) {
  return (
    <>
      {show && (
        <div
          className="fixed z-50 pointer-events-auto animate-in fade-in-0 zoom-in-95 duration-150 ease-out"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="bg-background border border-border rounded-lg shadow-lg p-1.5">
            <Button
              size="sm"
              onClick={onAsk}
              className="h-8 px-3 gap-2 rounded-md shadow-none"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Ask
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

'use client';

import { Button } from '@/components/ui/button';
import { MessageSquare, Quote } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TextSelectionAskProps {
  show: boolean;
  position: { x: number; y: number };
  onAsk: () => void;
  onClose: () => void;
}

export function TextSelectionAsk({ show, position, onAsk, onClose }: TextSelectionAskProps) {
  if (!show) return null;
  
  return (
    <div
      className="fixed z-50 pointer-events-auto animate-in fade-in-0 zoom-in-95 duration-150 ease-out"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%)',
      }}
    >
      <div className="bg-background border border-border rounded-lg shadow-lg overflow-hidden">
        <Button
          size="sm"
          variant="ghost"
          onClick={onAsk}
          className="h-9 px-3 gap-2 rounded-none hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          <Quote className="w-3.5 h-3.5" />
          <span className="text-[13px] font-medium">Ask about this</span>
          <MessageSquare className="w-3.5 h-3.5" />
        </Button>
      </div>
      {/* Arrow pointer */}
      <div 
        className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-border"
      />
      <div 
        className="absolute left-1/2 -translate-x-1/2 top-full -mt-[1px] w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-background"
      />
    </div>
  );
}

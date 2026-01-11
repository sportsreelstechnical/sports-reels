import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface BeepingBorderProps {
  children: React.ReactNode;
  isActive?: boolean;
  className?: string;
  duration?: number; // Auto-hide after duration (ms)
}

export const BeepingBorder: React.FC<BeepingBorderProps> = ({
  children,
  isActive = false,
  className,
  duration = 10000 // 10 seconds default
}) => {
  const [showBorder, setShowBorder] = useState(isActive);

  useEffect(() => {
    setShowBorder(isActive);
    
    if (isActive && duration > 0) {
      const timer = setTimeout(() => {
        setShowBorder(false);
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [isActive, duration]);

  if (!showBorder) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={cn("relative", className)}>
      {/* Multiple animated border layers for beeping effect */}
      <div className="absolute inset-0 rounded-lg border-2 border-red-500 animate-ping opacity-60" />
      <div className="absolute inset-0 rounded-lg border-2 border-red-400 animate-pulse opacity-80" />
      <div className="absolute inset-0 rounded-lg border border-red-300 animate-bounce opacity-40" />
      
      {/* Content with red border */}
      <div className="relative z-10 border-2 border-red-500 rounded-lg bg-red-50/5">
        {children}
      </div>
    </div>
  );
};

import React from 'react';
import { cn } from '../../lib/utils';

const Progress = React.forwardRef(({ className, value, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative h-6 w-full overflow-hidden rounded-full bg-primary/20", // Increased height for text
      className
    )}
    {...props}
  >
    <div
      className="h-full bg-primary transition-all flex items-center justify-end px-2 text-sm font-medium text-primary-foreground" // Added text styles
      style={{ width: `${value}%` }}
    >
      {value > 0 && value < 100 ? `${Math.round(value)}%` : null}
    </div>
  </div>
));
Progress.displayName = "Progress";

export { Progress };

import * as React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';
import { cn } from '@/shared/lib/utils';

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    ref={ref}
    className={cn(
      'relative inline-flex h-3 w-8 cursor-pointer items-center transition-colors',
      'bg-gray-300 data-[state=checked]:bg-[#E4A64E]',
      className
    )}
    {...props}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        'absolute left-0.5  h-3.5  w-3.5 rounded-full bg-white shadow-md transition-transform',
        'data-[state=checked]:translate-x-5'
      )}
    />
  </SwitchPrimitives.Root>
));

Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };

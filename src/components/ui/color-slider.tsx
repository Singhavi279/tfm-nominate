"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils"

interface ColorSliderProps extends Omit<React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>, 'children'> {
    trackColor?: string;
    thumbColor?: string;
}

const ColorSlider = React.forwardRef<
    React.ElementRef<typeof SliderPrimitive.Root>,
    ColorSliderProps
>(({ className, trackColor, thumbColor, ...props }, ref) => (
    <SliderPrimitive.Root
        ref={ref}
        className={cn(
            "relative flex w-full touch-none select-none items-center",
            className
        )}
        {...props}
    >
        <SliderPrimitive.Track
            className="relative h-2.5 w-full grow overflow-hidden rounded-full"
            style={{ background: "linear-gradient(to right, hsl(0,80%,88%), hsl(60,80%,88%), hsl(130,80%,88%))" }}
        >
            <SliderPrimitive.Range
                className="absolute h-full rounded-full transition-colors"
                style={{ backgroundColor: trackColor || "hsl(var(--primary))" }}
            />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
            className="block h-6 w-6 rounded-full border-[3px] bg-background shadow-md ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            style={{ borderColor: thumbColor || trackColor || "hsl(var(--primary))" }}
        />
    </SliderPrimitive.Root>
))
ColorSlider.displayName = "ColorSlider"

export { ColorSlider }

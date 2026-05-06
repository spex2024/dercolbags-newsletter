import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

interface PreloaderProps {
  className?: string
  text?: string
  duration?: number
}

export function Preloader({ className, text = "Processing request...", duration = 5000 }: PreloaderProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const startTime = Date.now()
    let animationFrameId: number

    const updateProgress = () => {
      const elapsed = Date.now() - startTime
      const currentProgress = Math.min(Math.floor((elapsed / duration) * 100), 100)
      
      setProgress(currentProgress)
      
      if (currentProgress < 100) {
        animationFrameId = requestAnimationFrame(updateProgress)
      }
    }
    
    animationFrameId = requestAnimationFrame(updateProgress)

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [duration])

  return (
    <div className={cn("fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background", className)}>
      
      {/* Huge Percentage */}
      <div className="text-[150px] leading-none md:text-[250px] font-medium text-foreground tracking-tighter">
        {progress}%
      </div>

      {/* Bottom Progress Container */}
      <div className="absolute bottom-0 left-0 right-0 flex flex-col">
        <div className="px-8 pb-3">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            {text}
          </p>
        </div>
        <div className="h-1.5 w-full bg-muted overflow-hidden">
          <div 
            className="h-full bg-foreground transition-all duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

    </div>
  )
}

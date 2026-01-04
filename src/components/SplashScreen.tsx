import { useState, useEffect } from "react";
import Lottie from "lottie-react";
import financeAnimation from "@/assets/Finance.json";

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Show animation for 2.5 seconds, then fade out
    const timer = setTimeout(() => {
      setFadeOut(true);
      // Wait for fade to complete before calling onComplete
      setTimeout(onComplete, 500);
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div 
      className={`fixed inset-0 bg-background flex items-center justify-center z-50 transition-opacity duration-500 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="w-64 h-64">
        <Lottie 
          animationData={financeAnimation} 
          loop={true}
          autoplay={true}
        />
      </div>
    </div>
  );
}

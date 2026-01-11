import logoImage from "@assets/WhatsApp_Image_2025-12-17_at_12.49.33_1766008177672.jpeg";

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = "Loading..." }: LoadingScreenProps) {
  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center bg-background"
      data-testid="loading-screen"
    >
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <img 
            src={logoImage} 
            alt="Sports Reels" 
            className="w-24 h-24 object-contain animate-pulse"
          />
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
    </div>
  );
}

export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8", 
    lg: "w-12 h-12"
  };
  
  return (
    <div className={`${sizeClasses[size]} border-2 border-primary border-t-transparent rounded-full animate-spin`} />
  );
}

export function LogoWithSpinner() {
  return (
    <div className="flex flex-col items-center gap-4">
      <img 
        src={logoImage} 
        alt="Sports Reels" 
        className="w-16 h-16 object-contain"
      />
      <LoadingSpinner size="sm" />
    </div>
  );
}

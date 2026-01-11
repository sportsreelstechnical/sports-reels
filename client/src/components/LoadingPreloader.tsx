
import React from 'react';

const LoadingPreloader: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <div className="text-center">
        {/* Logo/Brand */}
        <div className="mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-rosegold rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-white">RC</span>
          </div>
          <h1 className="text-2xl font-polysans text-white">Reel Connect</h1>
          <p className="text-gray-400 text-sm">Sports Hub</p>
        </div>

        {/* Animated Loading Spinner */}
        <div className="relative">
          <div className="w-12 h-12 border-4 border-gray-600 border-t-rosegold rounded-full animate-spin mx-auto"></div>
          <div className="mt-4">
            <div className="flex justify-center space-x-1">
              <div className="w-2 h-2 bg-rosegold rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-rosegold rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-rosegold rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>

        {/* Loading Text */}
        <div className="mt-6">
          <p className="text-gray-400 text-sm animate-pulse">Loading your sports hub...</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingPreloader;

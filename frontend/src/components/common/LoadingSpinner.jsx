import React from 'react';

const LoadingSpinner = ({ size = 'md', text = 'Đang tải...' }) => {
  const sizes = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
  };

  if (size === 'skeleton') {
    return (
      <div className="space-y-4 py-8">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-4 w-full max-w-md" />
        <div className="skeleton h-4 w-3/4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl overflow-hidden">
              <div className="aspect-square skeleton" />
              <div className="p-4 space-y-3">
                <div className="skeleton h-3 w-16" />
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-5 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (size === 'table') {
    return (
      <div className="space-y-3 py-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center space-x-4 p-4 rounded-2xl bg-surface-secondary">
            <div className="skeleton h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-3 w-1/2" />
            </div>
            <div className="skeleton h-4 w-20" />
            <div className="skeleton h-8 w-16 rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
      <div className="relative">
        <div className={`${sizes[size]} animate-spin rounded-full border-2 border-gray-100 border-t-primary-600`} />
        <div className={`${sizes[size]} absolute inset-0 animate-ping rounded-full border-2 border-primary-200 opacity-20`} />
      </div>
      {text && <p className="mt-5 text-ink-secondary text-sm font-medium">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;

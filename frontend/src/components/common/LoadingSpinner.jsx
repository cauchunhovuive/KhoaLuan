import React from 'react';

const LoadingSpinner = ({ size = 'md', text = 'Đang tải...' }) => {
  const sizes = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
  };

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className={`${sizes[size]} animate-spin rounded-full border-4 border-gray-200 border-t-primary-600`} />
      {text && <p className="mt-4 text-gray-500 text-sm">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;

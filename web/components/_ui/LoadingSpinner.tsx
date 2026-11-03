const LoadingSpinner = () => {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-primary"></div>
    </div>
  );
};

export default LoadingSpinner;

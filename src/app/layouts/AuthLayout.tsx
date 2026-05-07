import { Outlet } from 'react-router-dom';
import { useCallback, useMemo, useState } from 'react';

export default function AuthLayout() {
  const [image, setImage] = useState('/img/login.png');

  const handleSetImage = useCallback((src: string) => {
    setImage(src);
  }, []);

  const outletContext = useMemo(() => ({ setImage: handleSetImage }), [handleSetImage]);

  return (
    <div className="min-h-screen bg-[#A9B9D6] overflow-auto">
      <div className="w-full min-h-screen bg-[#8EA8DA] flex flex-col lg:flex-row relative">
        {/* LEFT IMAGE - Hidden on mobile, shown on desktop */}
        <div className="hidden lg:flex relative w-full h-screen flex-shrink-0">
          <img src={image} alt="robot" className="max-h-full max-w-full object-contain" />
          <img src="/img/logo1.png" alt="logo" className="absolute top-6 left-10 w-28" />
        </div>

        {/* RIGHT CONTENT */}
        <div className="w-full lg:absolute lg:right-12 lg:top-0 lg:h-full lg:w-1/2 px-6 sm:px-12 md:px-20 lg:px-40 py-8 lg:py-12 text-white flex flex-col justify-center">
          <Outlet context={outletContext} />
        </div>
      </div>
    </div>
  );
}

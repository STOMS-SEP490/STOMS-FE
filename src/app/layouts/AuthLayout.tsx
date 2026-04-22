import { Outlet } from 'react-router-dom';
import { useCallback, useMemo, useState } from 'react';

export default function AuthLayout() {
  const [image, setImage] = useState('/img/login.png');

  const handleSetImage = useCallback((src: string) => {
    setImage(src);
  }, []);

  const outletContext = useMemo(() => ({ setImage: handleSetImage }), [handleSetImage]);

  return (
    <div className="h-screen bg-[#A9B9D6] overflow-hidden">
      <div className="w-full h-full bg-[#8EA8DA] flex relative">
        {/* LEFT IMAGE */}
        <div className="relative w-full h-full flex">
          <img src={image} alt="robot" className="max-h-full max-w-full object-contain" />

          <img src="/img/logo1.png" alt="logo" className="absolute top-6 left-10 w-28" />
        </div>

        {/* RIGHT CONTENT */}
        <div className="absolute right-12 top-0 h-full w-1/2 px-40 py-12 text-white flex flex-col justify-center">
          <Outlet context={outletContext} />
        </div>
      </div>
    </div>
  );
}

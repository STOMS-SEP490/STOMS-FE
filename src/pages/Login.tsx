import { useEffect } from "react";
import { Link, useOutletContext } from "react-router-dom";

type AuthContextType = {
  setImage: (src: string) => void;
};

export default function Login() {
  const { setImage } = useOutletContext<AuthContextType>();

  useEffect(() => {
    setImage("/img/login.png");
  }, []);
  
  return (
  <>
  {/* RIGHT FORM PANEL */}
    <>


      <h2 className="text-5xl font-bold">ĐĂNG NHẬP</h2>
      <p className="text-sm text-white/80 mt-2 mb-8">
        Đăng nhập bằng địa chỉ email
      </p>

      <form className="space-y-4">

        {/* Email */}
        <input
          type="email"
          placeholder="abc@gmail.com"
          className="w-full px-4 py-3 rounded-lg 
                      bg-[#6e8ebd] placeholder-white/70
                      focus:outline-none focus:ring-2 focus:ring-blue-950"
        />

        {/* Password */}
        <input
          type="password"
          placeholder="*****"
          className="w-full px-4 py-3 rounded-lg 
                      bg-[#6e8ebd] placeholder-white/70
                      focus:outline-none focus:ring-2 focus:ring-blue-950"
        />

        {/* Login Button */}
        <button
          type="submit"
          className="w-full py-3 rounded-lg 
                      bg-[#193350]
                      hover:opacity-90 transition"
        >
          Đăng Nhập
        </button>

        {/* Forgot */}
        <div className="text-right text-sm">
          <Link to="/forgot-password" className="text-blue-200 hover:underline">
            Quên mật khẩu?
          </Link>
        </div>

        {/* Divider */}
        <div className="flex items-center my-4">
          <div className="flex-1 h-px bg-white/40"></div>
        </div>

        {/* Google Button */}
        <button
          type="button"
          className="w-full py-3 rounded-lg 
                      bg-[#ffffff] hover:opacity-90 
                      flex items-center justify-center gap-2 text-black"
        >
          <img
            src="/img/gg.png"
            className="w-5 h-5"
          />
          Google
        </button>

      </form>
    </>
  </>


  );
}


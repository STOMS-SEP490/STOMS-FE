import { Link } from "react-router-dom";

export default function Login() {
  return (
  <div className="h-screen bg-[#A9B9D6] overflow-hidden">
    <div className="w-full h-full bg-[#8EA8DA] flex relative">

      {/* LEFT IMAGE PANEL */}
      <div className="relative w-full h-full flex">
        <img
          src="/img/login.png"
          alt="robot"
          className="max-h-full max-w-full object-contain"
        />

        <img
          src="/img/logo1.png"
          alt="logo"
          className="absolute top-6 left-10 w-28"
        />
      </div>

      {/* RIGHT FORM PANEL */}
        <div className="absolute right-0 top-0 h-full w-1/2
                px-40 py-12 
                text-white 
                flex flex-col justify-center">


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
              <Link to="#" className="text-blue-200 hover:underline">
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
        </div>
    </div>
  </div>


  );
}


 {/* RIGHT FORM PANEL */}
        <div className=" px-16 py-12 text-white">

          <h2 className="text-4xl font-extrabold">SIGN IN</h2>
          <p className="text-sm text-white/80 mt-2 mb-8">
            Sign in with email address
          </p>

          <form className="space-y-4">

            {/* Email */}
            <input
              type="email"
              placeholder="Yourname@gmail.com"
              className="w-full px-4 py-3 rounded-lg 
                         bg-[#7F95B8] placeholder-white/70
                         focus:outline-none focus:ring-2 focus:ring-blue-400"
            />

            {/* Password */}
            <input
              type="password"
              placeholder="Yourpassword"
              className="w-full px-4 py-3 rounded-lg 
                         bg-[#7F95B8] placeholder-white/70
                         focus:outline-none focus:ring-2 focus:ring-blue-400"
            />

            {/* Login Button */}
            <button
              type="submit"
              className="w-full py-3 rounded-lg 
                         bg-gradient-to-r from-blue-600 to-blue-400
                         hover:opacity-90 transition"
            >
              Login
            </button>

            {/* Forgot */}
            <div className="text-right text-sm">
              <Link to="#" className="text-blue-200 hover:underline">
                Forgot password?
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
                         bg-[#5B3B87] hover:opacity-90 
                         flex items-center justify-center gap-2"
            >
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google"
                className="w-5 h-5"
              />
              Google
            </button>

          </form>
        </div>
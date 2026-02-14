import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useOutletContext } from "react-router-dom";

type AuthContextType = {
  setImage: (src: string) => void;
};

export default function ForgotPassword() {
    const { setImage } = useOutletContext<AuthContextType>();

    useEffect(() => {
        setImage("/img/ForgotPassword.png");
    }, []);

    const navigate = useNavigate();
    const [step, setStep] = useState(1);

    type FormValues = {
        password: string;
        confirmPassword: string;
    };
    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isValid  },
    } = useForm<FormValues>({  mode: "onChange",});

    const password = watch("password");

    const onSubmit = (data: FormValues) => {
        console.log("Form data:", data);
        navigate("/login");

    };

  
    return (
        <>
        {step === 1 &&(
            <>
                <h2 className="text-5xl font-bold">QUÊN MẬT KHẨU</h2>
                <p className="text-sm text-white/80 mt-2 mb-8">
                    Hãy nhập địa chỉ email của bạn để khôi phục mật khẩu.
                </p>

                <form className="space-y-8">

                    {/* Email */}
                    <input
                    type="email"
                    placeholder="abc@gmail.com"
                    className="w-full px-4 py-3 rounded-lg 
                                bg-[#6e8ebd] placeholder-white/70
                                focus:outline-none focus:ring-2 focus:ring-blue-950"
                    />

                    
                    {/* Button */}
                    <button onClick={()=>setStep(2)}
                    type="submit"
                    className="w-full py-3 rounded-lg 
                                bg-[#193350]
                                hover:opacity-90 transition"
                    >
                        Gửi Yêu Cầu
                    </button>
                </form>
            </>
        )}

        {step === 2 && (
            <>
            <h2 className="text-5xl font-bold">Kiểm Tra Email Của Bạn</h2>
            <p className="text-sm text-white/80 mt-2 mb-8">
                Chúng tôi đã gửi mã OTP đến email của bạn.<br/> Vui lòng nhập mã để tiếp tục.
            </p>

            <input
                type="text"
                placeholder="Mã OTP"
                className="w-full px-4 py-3 rounded-lg bg-[#6e8ebd] placeholder-white/70
                                focus:outline-none focus:ring-2 focus:ring-blue-950"
            />

            <button
                onClick={() => setStep(3)}
                className="w-full py-3 mt-6 rounded-lg bg-[#193350]"
            >
                Xác Nhận Mã
            </button>
            </>
        )}

        {step === 3 && (
            <>
                <h2 className="text-5xl font-bold">Đặt Lại Mật Khẩu</h2>
                <p className="text-sm text-white/80 mt-2 mb-8">
                Vui lòng nhập mật khẩu mới của bạn.
                </p>

                <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-6"
                >
                {/* Password */}
                <input
                    type="password"
                    placeholder="Mật khẩu mới"
                    {...register("password")}

                    className="w-full px-4 py-3 rounded-lg bg-[#6e8ebd] placeholder-white/70
                                            focus:outline-none focus:ring-2 focus:ring-blue-950"
                />
                

                {/* Confirm Password */}
                <input
                    type="password"
                    placeholder="Xác nhận mật khẩu"
                    {...register("confirmPassword", {
                    validate: (value) =>
                        value === password || "Mật khẩu không khớp",
                    })}
                    className="w-full px-4 py-3 rounded-lg bg-[#6e8ebd] placeholder-white/70
                                            focus:outline-none focus:ring-2 focus:ring-blue-950"
                />
                {errors.confirmPassword && (
                    <p className="text-red-800 text-sm -mt-6">
                    {errors.confirmPassword.message}
                    </p>
                )}

                {/* Button */}
                <button
                    type="submit"
                    disabled={!isValid}
                    className={`w-full py-3 rounded-lg transition
                    ${
                    isValid
                        ? "bg-[#193350] hover:opacity-90"
                        : "bg-gray-500 cursor-not-allowed"
                    }`}
                >
                    Cập Nhật Mật Khẩu
                </button>
                </form>
            </>
)}

        </>
  );
}

<>


      <h2 className="text-5xl font-bold">QUÊN MẬT KHẨU</h2>
      <p className="text-sm text-white/80 mt-2 mb-8">
        Hãy nhập địa chỉ email của bạn để khôi phục mật khẩu.
      </p>

      <form className="space-y-8">

        {/* Email */}
        <input
          type="email"
          placeholder="abc@gmail.com"
          className="w-full px-4 py-3 rounded-lg 
                      bg-[#6e8ebd] placeholder-white/70
                      focus:outline-none focus:ring-2 focus:ring-blue-950"
        />

        
        {/* Button */}
        <button
          type="submit"
          className="w-full py-3 rounded-lg 
                      bg-[#193350]
                      hover:opacity-90 transition"
        >
            Gửi Yêu Cầu
        </button>


      </form>
    </>


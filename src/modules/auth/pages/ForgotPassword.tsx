import authService from '@/modules/auth/api/authApi';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useOutletContext } from 'react-router-dom';

type AuthContextType = {
  setImage: (src: string) => void;
};

export default function ForgotPassword() {
  const { setImage } = useOutletContext<AuthContextType>();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setImage('/img/ForgotPassword.png');
  }, []);

  type FormValues = {
    password: string;
    confirmPassword: string;
  };

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<FormValues>({ mode: 'onChange' });

  const password = watch('password');

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await authService.requestForgotPasswordOtp(email);
      setStep(2);
    } catch (error) {
      console.error(error);
      alert('Gửi OTP thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOtp = () => {
    if (!otp) {
      alert('Vui lòng nhập OTP');
      return;
    }
    setStep(3);
  };

  const onSubmit = async (data: FormValues) => {
    try {
      setLoading(true);
      await authService.confirmForgotPassword({
        email,
        otp,
        newPassword: data.password,
        confirmPassword: data.confirmPassword,
      });

      alert('Đổi mật khẩu thành công');
      navigate('/login');
    } catch (error) {
      console.error(error);
      alert('Đổi mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {step === 1 && (
        <>
          <h2 className="text-5xl font-bold">QUÊN MẬT KHẨU</h2>
          <p className="text-sm text-white/80 mt-2 mb-8">
            Hãy nhập địa chỉ email của bạn để khôi phục mật khẩu.
          </p>

          <form onSubmit={handleRequestOtp} className="space-y-8">
            <input
              type="email"
              placeholder="abc@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg 
                bg-[#6e8ebd] placeholder-white/70
                focus:outline-none focus:ring-2 focus:ring-blue-950"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg 
                bg-[#193350]
                hover:opacity-90 transition"
            >
              {loading ? 'Đang gửi...' : 'Gửi Yêu Cầu'}
            </button>
          </form>
        </>
      )}

      {step === 2 && (
        <>
          <h2 className="text-5xl font-bold">Kiểm Tra Email Của Bạn</h2>
          <p className="text-sm text-white/80 mt-2 mb-8">
            Chúng tôi đã gửi mã OTP đến email của bạn.
            <br /> Vui lòng nhập mã để tiếp tục.
          </p>

          <input
            type="text"
            placeholder="Mã OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-[#6e8ebd] placeholder-white/70
              focus:outline-none focus:ring-2 focus:ring-blue-950"
          />

          <button
            onClick={handleConfirmOtp}
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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <input
              type="password"
              placeholder="Mật khẩu mới"
              {...register('password', { required: 'Bắt buộc nhập mật khẩu' })}
              className="w-full px-4 py-3 rounded-lg bg-[#6e8ebd] placeholder-white/70
                focus:outline-none focus:ring-2 focus:ring-blue-950"
            />

            <input
              type="password"
              placeholder="Xác nhận mật khẩu"
              {...register('confirmPassword', {
                validate: (value) =>
                  value === password || 'Mật khẩu không khớp',
              })}
              className="w-full px-4 py-3 rounded-lg bg-[#6e8ebd] placeholder-white/70
                focus:outline-none focus:ring-2 focus:ring-blue-950"
            />

            {errors.confirmPassword && (
              <p className="text-red-800 text-sm -mt-4">
                {errors.confirmPassword.message}
              </p>
            )}

            <button
              type="submit"
              disabled={!isValid || loading}
              className={`w-full py-3 rounded-lg transition
                ${
                  isValid
                    ? 'bg-[#193350] hover:opacity-90'
                    : 'bg-gray-500 cursor-not-allowed'
                }`}
            >
              {loading ? 'Đang cập nhật...' : 'Cập Nhật Mật Khẩu'}
            </button>
          </form>
        </>
      )}
    </>
  );
}
import authService from '@/modules/auth/api/authApi';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, Lock, Mail } from 'lucide-react';

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const inputClass =
    'w-full rounded-2xl border border-sky-100 bg-white py-3 pl-12 pr-4 text-slate-700 placeholder-slate-400 shadow-[0_4px_16px_rgba(2,132,199,0.08)] focus:outline-none focus:ring-2 focus:ring-sky-300';
  const inputPasswordClass =
    'w-full rounded-2xl border border-sky-100 bg-white py-3 pl-12 pr-12 text-slate-700 placeholder-slate-400 shadow-[0_4px_16px_rgba(2,132,199,0.08)] focus:outline-none focus:ring-2 focus:ring-sky-300';
  const primaryBtnClass =
    'w-full py-3 rounded-lg bg-[#193350] text-white hover:opacity-90 transition disabled:opacity-70';

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

          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Mail size={18} />
              </span>
              <input
                type="email"
                placeholder="Email của bạn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputClass}
              />
            </div>

            <button type="submit" disabled={loading} className={`mt-4 ${primaryBtnClass}`}>
              {loading ? 'Đang gửi...' : 'Gửi Yêu Cầu'}
            </button>

            <div className="text-right text-sm">
              <Link to="/login" className="text-blue-200 hover:underline">
                Quay lại đăng nhập
              </Link>
            </div>
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

          <div className="space-y-4">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <KeyRound size={18} />
              </span>
              <input
                type="text"
                placeholder="Mã OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className={inputClass}
              />
            </div>

            <button type="button" onClick={handleConfirmOtp} className={`mt-2 ${primaryBtnClass}`}>
              Xác Nhận Mã
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <h2 className="text-5xl font-bold">Đặt Lại Mật Khẩu</h2>
          <p className="text-sm text-white/80 mt-2 mb-8">
            Vui lòng nhập mật khẩu mới của bạn.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Lock size={18} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Mật khẩu mới"
                {...register('password', { required: 'Bắt buộc nhập mật khẩu' })}
                className={inputPasswordClass}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition bg-transparent border-0 p-0"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Lock size={18} />
              </span>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Xác nhận mật khẩu"
                {...register('confirmPassword', {
                  validate: (value) =>
                    value === password || 'Mật khẩu không khớp',
                })}
                className={inputPasswordClass}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition bg-transparent border-0 p-0"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {errors.confirmPassword && (
              <p className="text-red-200 text-sm">{errors.confirmPassword.message}</p>
            )}

            <button
              type="submit"
              disabled={!isValid || loading}
              className={`mt-4 w-full py-3 rounded-lg text-white transition
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
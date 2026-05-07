import authService from '@/modules/auth/api/authApi';
import { getErrorMessage } from '@/shared/lib/errorMessage';
import { message } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, Lock, Mail } from 'lucide-react';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AuthContextType = {
  setImage: (src: string) => void;
};

export default function ForgotPassword() {
  const { setImage } = useOutletContext<AuthContextType>();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  /** Token từ API verify OTP, bắt buộc cho POST /auth/forgot-password/completions */
  const [resetToken, setResetToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const inputClass =
    'w-full rounded-xl sm:rounded-2xl border border-sky-100 bg-white py-2.5 sm:py-3 pl-10 sm:pl-12 pr-3 sm:pr-4 text-sm sm:text-base text-slate-700 placeholder-slate-400 shadow-[0_4px_16px_rgba(2,132,199,0.08)] focus:outline-none focus:ring-2 focus:ring-sky-300';
  const inputPasswordClass =
    'w-full rounded-xl sm:rounded-2xl border border-sky-100 bg-white py-2.5 sm:py-3 pl-10 sm:pl-12 pr-10 sm:pr-12 text-sm sm:text-base text-slate-700 placeholder-slate-400 shadow-[0_4px_16px_rgba(2,132,199,0.08)] focus:outline-none focus:ring-2 focus:ring-sky-300';
  const primaryBtnClass =
    'w-full py-2.5 sm:py-3 text-sm sm:text-base rounded-lg bg-[#193350] text-white hover:opacity-90 transition disabled:opacity-70';

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
    reset,
    formState: { errors, isValid },
  } = useForm<FormValues>({
    mode: 'onChange',
    defaultValues: { password: '', confirmPassword: '' },
  });

  const goBackToEmailStep = useCallback(() => {
    setStep(1);
    setOtp('');
    setResetToken('');
    reset({ password: '', confirmPassword: '' });
  }, [reset]);

  const password = watch('password');

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      message.warning('Vui lòng nhập email.');
      return;
    }
    if (!EMAIL_RE.test(trimmed)) {
      message.warning(
        'Email không hợp lệ.',
      );
      return;
    }
    try {
      setLoading(true);
      await authService.requestForgotPasswordOtp(trimmed);
      message.success('Đã gửi mã OTP đến email của bạn.');
      setResetToken('');
      setOtp('');
      setStep(2);
    } catch (error: unknown) {
      message.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOtp = async () => {
    const trimmedOtp = otp.trim();
    if (!trimmedOtp) {
      message.warning('Vui lòng nhập mã OTP.');
      return;
    }
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      message.warning('Thiếu email. Vui lòng quay lại bước 1.');
      setStep(1);
      return;
    }
    try {
      setLoading(true);
      const res = (await authService.verifyForgotPasswordOtp({
        email: trimmedEmail,
        otp: trimmedOtp,
      })) as { resetToken?: string; ResetToken?: string };
      const token =
        (typeof res?.resetToken === 'string' && res.resetToken) ||
        (typeof res?.ResetToken === 'string' && res.ResetToken) ||
        '';
      if (!token) {
        message.error('Không nhận được mã xác thực đặt lại mật khẩu. Vui lòng thử lại.');
        return;
      }
      setResetToken(token);
      message.success('Xác thực OTP thành công.');
      setStep(3);
    } catch (error: unknown) {
      message.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: FormValues) => {
    const token = resetToken.trim();
    if (!token) {
      message.error('Buổi đặt lại mật khẩu không hợp lệ. Vui lòng xác thực OTP lại.');
      setStep(2);
      return;
    }
    try {
      setLoading(true);
      await authService.completeForgotPassword({
        resetToken: token,
        newPassword: data.password,
        confirmPassword: data.confirmPassword,
      });

      message.success('Đổi mật khẩu thành công. Vui lòng đăng nhập lại.');
      navigate('/login');
    } catch (error: unknown) {
      message.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {step === 1 && (
        <>
          {/* Robot Image - Mobile only */}
          <div className="flex justify-start items-center mb-6 lg:hidden h-[40vh] sm:h-[45vh] w-full overflow-hidden -mx-6 sm:-mx-12 md:-mx-20">
            <img 
              src="/img/ForgotPassword.png" 
              alt="Forgot Password" 
              className="h-full w-full object-cover object-left" 
            />
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">QUÊN MẬT KHẨU</h2>
          <p className="text-xs sm:text-sm text-white/80 mt-2 mb-6 sm:mb-8">
            Hãy nhập địa chỉ email của bạn để khôi phục mật khẩu.
          </p>

          <form onSubmit={handleRequestOtp} className="space-y-3 sm:space-y-4" noValidate>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Mail size={18} />
              </span>
              <input
                type="text"
                inputMode="email"
                name="email"
                autoComplete="email"
                placeholder="Email của bạn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>

            <button type="submit" disabled={loading} className={`mt-3 sm:mt-4 ${primaryBtnClass}`}>
              {loading ? 'Đang gửi...' : 'Gửi Yêu Cầu'}
            </button>

            <div className="text-right text-xs sm:text-sm">
              <Link to="/login" className="text-blue-200 hover:underline">
                Quay lại đăng nhập
              </Link>
            </div>
          </form>
        </>
      )}

      {step === 2 && (
        <>
          {/* Robot Image - Mobile only */}
          <div className="flex justify-start items-center mb-6 lg:hidden h-[40vh] sm:h-[45vh] w-full overflow-hidden -mx-6 sm:-mx-12 md:-mx-20">
            <img 
              src="/img/ForgotPassword.png" 
              alt="Forgot Password" 
              className="h-full w-full object-cover object-left" 
            />
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">Kiểm Tra Email Của Bạn</h2>
          <p className="text-xs sm:text-sm text-white/80 mt-2 mb-6 sm:mb-8">
            Chúng tôi đã gửi mã OTP đến email của bạn.
            <br /> Vui lòng nhập mã để tiếp tục.
          </p>

          <div className="space-y-3 sm:space-y-4">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400">
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

            <button
              type="button"
              disabled={loading}
              onClick={() => void handleConfirmOtp()}
              className={`mt-2 ${primaryBtnClass}`}
            >
              {loading ? 'Đang xác thực...' : 'Xác Nhận Mã'}
            </button>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 text-xs sm:text-sm">
              <button
                type="button"
                disabled={loading}
                onClick={goBackToEmailStep}
                className="text-left text-blue-200 hover:underline disabled:opacity-60"
              >
                Quay lại nhập email
              </button>
              <Link to="/login" className="text-right text-blue-200 hover:underline sm:ml-auto">
                Quay lại đăng nhập
              </Link>
            </div>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          {/* Robot Image - Mobile only */}
          <div className="flex justify-start items-center mb-6 lg:hidden h-[40vh] sm:h-[45vh] w-full overflow-hidden -mx-6 sm:-mx-12 md:-mx-20">
            <img 
              src="/img/ForgotPassword.png" 
              alt="Forgot Password" 
              className="h-full w-full object-cover object-left" 
            />
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">Đặt Lại Mật Khẩu</h2>
          <p className="text-xs sm:text-sm text-white/80 mt-2 mb-6 sm:mb-8">
            Vui lòng nhập mật khẩu mới của bạn.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4" noValidate>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400">
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
              <span className="pointer-events-none absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400">
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
              <p className="text-red-200 text-xs sm:text-sm">{errors.confirmPassword.message}</p>
            )}

            <button
              type="submit"
              disabled={!isValid || loading}
              className={`mt-3 sm:mt-4 w-full py-2.5 sm:py-3 text-sm sm:text-base rounded-lg text-white transition
                ${
                  isValid
                    ? 'bg-[#193350] hover:opacity-90'
                    : 'bg-gray-500 cursor-not-allowed'
                }`}
            >
              {loading ? 'Đang cập nhật...' : 'Cập Nhật Mật Khẩu'}
            </button>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 text-xs sm:text-sm">
              <button
                type="button"
                disabled={loading}
                onClick={goBackToEmailStep}
                className="text-left text-blue-200 hover:underline disabled:opacity-60"
              >
                Quay lại nhập email
              </button>
              <Link to="/login" className="text-right text-blue-200 hover:underline sm:ml-auto">
                Quay lại đăng nhập
              </Link>
            </div>
          </form>
        </>
      )}
    </>
  );
}
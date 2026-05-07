import { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { message } from 'antd';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import authService from '@/modules/auth/api/authApi';
import { useAuth } from '@/app/providers/AuthProvider';
import {
  isRoleSelectionRequired,
  saveAuthToStorage,
} from '@/modules/auth/authStorage';
import { getHomePathByRole, getRoleIdFromStorage } from '@/modules/auth/roleAccess';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AuthContextType = {
  setImage: (src: string) => void;
};

export default function Login() {
  const { setImage } = useOutletContext<AuthContextType>();
  const navigate = useNavigate();
  const { login: setCurrentUser } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setImage('/img/login.png');

    // nếu đã login thì redirect
    const token = localStorage.getItem('accessToken');
    if (token) {
      const roleId = getRoleIdFromStorage();
      if (roleId != null) {
        navigate(getHomePathByRole(roleId));
      } else {
        navigate('/choose-role');
      }
    }
  }, [setImage, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      message.warning('Vui lòng nhập email và mật khẩu');
      return;
    }

    if (!EMAIL_RE.test(email.trim())) {
      message.warning('Email không hợp lệ');
      return;
    }

    if (loading) return;
    setLoading(true);

    try {
      // Lấy deviceUid đã lưu (nếu có) để BE nhận diện thiết bị
      let savedDeviceUid: string | undefined;
      try {
        const raw = localStorage.getItem('user');
        if (raw) savedDeviceUid = JSON.parse(raw)?.deviceUid || undefined;
      } catch { /* ignore */ }

      const res = await authService.login({
        email: email.trim(),
        password: password.trim(),
        deviceUid: savedDeviceUid,
        platform: 'web',
        deviceName: navigator.userAgent,
        fcmToken: '',
      });

      localStorage.clear();

      // BE yêu cầu chọn tư cách → lưu tạm thông tin rồi chuyển sang màn chọn
      if (isRoleSelectionRequired(res)) {
        sessionStorage.setItem('roleSelection', JSON.stringify(res));
        navigate('/choose-role');
        return;
      }

      // Đăng nhập thẳng — BE đã quyết định activeRoleId
      saveAuthToStorage(res);
      setCurrentUser({
        id: res.userId,
        email: res.email,
        fullName: res.email,
        role: String(res.activeRoleId),
        token: res.accessToken,
      });
      message.success('Đăng nhập thành công');
      navigate(getHomePathByRole(res.activeRoleId));
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: unknown } };
      const data = axiosErr?.response?.data;
      const msg =
        (typeof data === 'string' && data) ||
        (typeof data === 'object' &&
          data !== null &&
          'message' in data &&
          String((data as Record<string, unknown>).message)) ||
        'Đăng nhập thất bại. Vui lòng kiểm tra lại email và mật khẩu.';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Robot Image - Hiển thị trên mobile và tablet, chiếm nửa màn hình, full width */}
      <div className="flex justify-start items-center mb-6 lg:hidden h-[40vh] sm:h-[45vh] w-full overflow-hidden -mx-6 sm:-mx-12 md:-mx-20">
        <img 
          src="/img/login.png" 
          alt="STOMS Robot" 
          className="h-full w-full object-cover object-left" 
        />
      </div>

      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">ĐĂNG NHẬP</h2>
      <p className="text-xs sm:text-sm text-white/80 mt-2 mb-6 sm:mb-8">
        Đăng nhập bằng địa chỉ email
      </p>

      <form className="space-y-3 sm:space-y-4" onSubmit={handleLogin} noValidate>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <Mail size={18} />
          </span>
          <input
            type="text"
            inputMode="email"
            autoComplete="email"
            placeholder="Email của bạn"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl sm:rounded-2xl border border-sky-100 bg-white py-2.5 sm:py-3 pl-10 sm:pl-12 pr-3 sm:pr-4 text-sm sm:text-base text-slate-700 placeholder-slate-400 shadow-[0_4px_16px_rgba(2,132,199,0.08)] focus:outline-none focus:ring-2 focus:ring-sky-300"
          />
        </div>

        <div className="relative">
          <span className="pointer-events-none absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <Lock size={18} />
          </span>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl sm:rounded-2xl border border-sky-100 bg-white py-2.5 sm:py-3 pl-10 sm:pl-12 pr-10 sm:pr-12 text-sm sm:text-base text-slate-700 placeholder-slate-400 shadow-[0_4px_16px_rgba(2,132,199,0.08)] focus:outline-none focus:ring-2 focus:ring-sky-300"
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

        <button
          type="submit"
          disabled={loading}
          className="mt-3 sm:mt-4 w-full py-2.5 sm:py-3 text-sm sm:text-base rounded-lg bg-[#193350] hover:opacity-90 transition disabled:opacity-60"
        >
          {loading ? 'Đang đăng nhập...' : 'Đăng Nhập'}
        </button>

        <div className="text-right text-xs sm:text-sm">
          <Link to="/forgot-password" className="text-blue-200 hover:underline">
            Quên mật khẩu?
          </Link>
        </div>
      </form>

      <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-white/20">
       
        <a
          href="/apk/app-release.apk"
          download="STOMS-Mobile.apk"
          className="group flex items-center justify-center gap-2 sm:gap-2.5 px-4 sm:px-5 py-2 sm:py-2.5 bg-white rounded-lg sm:rounded-xl hover:bg-white/95 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
        >
          <svg 
            className="w-4 h-4 sm:w-5 sm:h-5 text-[#193350] group-hover:translate-y-0.5 transition-transform" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span className="text-xs sm:text-sm font-semibold text-[#193350]">
            Tải APK cho Android
          </span>
        </a>
       
      </div>
    </>
  );
}

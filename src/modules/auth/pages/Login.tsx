import { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import authService from '@/modules/auth/api/authApi';
import { useAuth } from '@/app/providers/AuthProvider';
import { saveAuthToStorage } from '@/modules/auth/authStorage';
import { getHomePathByRole, getRoleIdFromStorage } from '@/modules/auth/roleAccess';

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
      navigate(getHomePathByRole(getRoleIdFromStorage()));
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      alert('Vui lòng nhập email và mật khẩu');
      return;
    }

    if (loading) return;

    setLoading(true);

    try {
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

      // clear token/user cũ
      localStorage.clear();

      // lưu token + user (dùng helper chung)
      saveAuthToStorage(res);

      // đồng bộ với AuthProvider (currentUser) để useAuth() nhận biết đã login
      setCurrentUser({
        id: res.userId,
        email: res.email,
        fullName: res.email,
        role: String(res.roleId),
        token: res.accessToken,
      });

      navigate(getHomePathByRole(Number(res.roleId)));
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: unknown; status?: number } };
      const data = axiosErr?.response?.data;
      const msg =
        (typeof data === 'string' && data) ||
        (typeof data === 'object' && data !== null && 'message' in data && String((data as Record<string, unknown>).message)) ||
        'Đăng nhập thất bại. Vui lòng kiểm tra lại email và mật khẩu.';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h2 className="text-5xl font-bold">ĐĂNG NHẬP</h2>
      <p className="text-sm text-white/80 mt-2 mb-8">
        Đăng nhập bằng địa chỉ email
      </p>

      <form className="space-y-4" onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="abc@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 rounded-lg 
                    bg-[#6e8ebd] placeholder-white/70
                    focus:outline-none focus:ring-2 focus:ring-blue-950"
        />

        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="*****"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 pr-12 rounded-lg 
                      bg-[#6e8ebd] placeholder-white/70
                      focus:outline-none focus:ring-2 focus:ring-blue-950"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition bg-transparent border-0 p-0"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg 
                    bg-[#193350]
                    hover:opacity-90 transition"
        >
          {loading ? 'Đang đăng nhập...' : 'Đăng Nhập'}
        </button>

        <div className="text-right text-sm">
          <Link to="/forgot-password" className="text-blue-200 hover:underline">
            Quên mật khẩu?
          </Link>
        </div>
      </form>
    </>
  );
}
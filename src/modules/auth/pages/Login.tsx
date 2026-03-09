import { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import authService from '@/modules/auth/api/authApi';
import { useAuth } from '@/app/providers/AuthProvider';

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

  useEffect(() => {
    setImage('/img/login.png');

    // nếu đã login thì redirect
    const token = localStorage.getItem('accessToken');
    if (token) {
      navigate('/manager');
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
      const res = await authService.login({
        email: email.trim(),
        password: password.trim(),
        platform: 'web',
        deviceName: navigator.userAgent,
        fcmToken: '',
      });

      // clear token/user cũ
      localStorage.clear();

      // lưu token + user cho các phần khác (giữ cấu trúc cũ)
      localStorage.setItem('accessToken', res.accessToken);
      localStorage.setItem('refreshToken', res.refreshToken);
      localStorage.setItem('accessTokenExpiresAt', res.accessTokenExpiresAt);
      localStorage.setItem('refreshTokenExpiresAt', res.refreshTokenExpiresAt);

      localStorage.setItem(
        'user',
        JSON.stringify({
          userId: res.userId,
          memberId: res.memberId,
          email: res.email,
          roleId: res.roleId,
          deviceUid: res.deviceUid,
        })
      );

      // đồng bộ với AuthProvider (currentUser) để useAuth() nhận biết đã login
      setCurrentUser({
        id: res.userId,
        email: res.email,
        fullName: res.email,
        role: String(res.roleId),
        token: res.accessToken,
      });

      navigate('/manager');
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data ||
        'Đăng nhập thất bại';

      alert(message);
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

        <input
          type="password"
          placeholder="*****"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
          {loading ? 'Đang đăng nhập...' : 'Đăng Nhập'}
        </button>

        <div className="text-right text-sm">
          <Link to="/forgot-password" className="text-blue-200 hover:underline">
            Quên mật khẩu?
          </Link>
        </div>

        <div className="flex items-center my-4">
          <div className="flex-1 h-px bg-white/40"></div>
        </div>

        <button
          type="button"
          className="w-full py-3 rounded-lg 
                    bg-[#ffffff] hover:opacity-90 
                    flex items-center justify-center gap-2 text-black"
        >
          <img src="/img/gg.png" className="w-5 h-5" />
          Google
        </button>
      </form>
    </>
  );
}
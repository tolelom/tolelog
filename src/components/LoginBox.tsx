import { useContext } from 'react';
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { AUTH_API } from "../utils/api";
import AuthForm from './AuthForm';

const LOGIN_FIELDS = [
    { name: 'username', label: '아이디', type: 'text' },
    { name: 'password', label: '비밀번호', type: 'password' },
];

function validateLogin(formData: Record<string, string>): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!formData.username) {
        errors.username = "아이디를 입력해주세요.";
    } else if (formData.username.length < 4) {
        errors.username = "아이디는 4자 이상이어야 합니다.";
    } else if (formData.username.length > 20) {
        errors.username = "아이디는 20자 이하여야 합니다.";
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
        errors.username = "아이디는 영문, 숫자, 밑줄(_)만 사용 가능합니다.";
    }

    if (!formData.password) {
        errors.password = "비밀번호를 입력해주세요.";
    } else if (formData.password.length < 6) {
        errors.password = "비밀번호는 6자 이상이어야 합니다.";
    }

    return errors;
}

export default function LoginBox() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useContext(AuthContext);

    const handleSubmit = async (formData: Record<string, string>) => {
        const data = await AUTH_API.login(formData.username, formData.password);
        login({
            token: data.data.access_token,
            refreshToken: data.data.refresh_token,
            username: data.data.username,
            userId: data.data.user_id,
            avatarUrl: data.data.avatar_url,
        });
        const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
        navigate(from, { replace: true });
    };

    return (
        <AuthForm
            title="로그인"
            fields={LOGIN_FIELDS}
            submitLabel="로그인"
            loadingLabel="로그인 중..."
            onSubmit={handleSubmit}
            validate={validateLogin}
        />
    );
}

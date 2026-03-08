import { useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { AUTH_API } from "../utils/api";
import AuthForm from './AuthForm';

const REGISTER_FIELDS = [
    { name: 'username', label: '아이디', type: 'text' },
    { name: 'password', label: '비밀번호', type: 'password' },
    { name: 'confirmPassword', label: '비밀번호 확인', type: 'password' },
];

function validateRegister(formData: Record<string, string>): Record<string, string> {
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
    } else if (formData.password.length > 128) {
        errors.password = "비밀번호는 128자 이하여야 합니다.";
    }

    if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = "비밀번호가 일치하지 않습니다.";
    }

    return errors;
}

export default function RegisterBox() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useContext(AuthContext);

    const handleSubmit = async (formData: Record<string, string>) => {
        const data = await AUTH_API.register(formData.username, formData.password);
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
            title="회원가입"
            fields={REGISTER_FIELDS}
            submitLabel="회원가입"
            loadingLabel="가입 중..."
            onSubmit={handleSubmit}
            validate={validateRegister}
        />
    );
}

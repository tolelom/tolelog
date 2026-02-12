import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.js';
import { registerUser } from '../utils/authApi';
import AuthForm from './AuthForm';

const fields = [
    { name: 'username', label: '아이디', type: 'text' },
    { name: 'password', label: '비밀번호', type: 'password' },
    { name: 'confirmPassword', label: '비밀번호 확인', type: 'password' },
];

function validate(formData) {
    const errors = {};
    if (!formData.username) errors.username = '아이디를 입력해주세요.';
    if (!formData.password) errors.password = '비밀번호를 입력해주세요';
    if (formData.password && formData.password.length < 8) errors.password = '비밀번호는 8자 이상이어야 합니다.';
    if (formData.password !== formData.confirmPassword) errors.confirmPassword = '비밀번호가 일치하지 않습니다.';
    return errors;
}

export default function RegisterBox() {
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (formData) => {
        const data = await registerUser({
            username: formData.username,
            password: formData.password,
        });
        if (data.status === 'success' && data.data) {
            login({
                token: data.data.token,
                username: data.data.username,
                userId: data.data.user_id,
            });
            alert('회원가입 성공! 로그인되었습니다.');
            navigate('/');
        } else {
            throw new Error('회원가입 처리 중 오류가 발생했습니다');
        }
    };

    return (
        <AuthForm
            title="회원가입"
            fields={fields}
            submitLabel="회원가입"
            loadingLabel="가입 중..."
            onSubmit={handleSubmit}
            validate={validate}
        />
    );
}

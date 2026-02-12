import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.js';
import { loginUser } from '../utils/authApi';
import AuthForm from './AuthForm';

const fields = [
    { name: 'username', label: '아이디', type: 'text' },
    { name: 'password', label: '비밀번호', type: 'password' },
];

function validate(formData) {
    const errors = {};
    if (!formData.username) errors.username = '아이디를 입력해주세요.';
    if (!formData.password) errors.password = '비밀번호를 입력해주세요.';
    return errors;
}

export default function LoginBox() {
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (formData) => {
        const data = await loginUser(formData);
        if (data.status === 'success' && data.data) {
            login({
                token: data.data.token,
                username: data.data.username,
                userId: data.data.user_id,
            });
            navigate('/');
        } else {
            throw new Error('로그인 처리 중 오류가 발생했습니다');
        }
    };

    return (
        <AuthForm
            title="로그인"
            fields={fields}
            submitLabel="로그인"
            loadingLabel="로그인 중..."
            onSubmit={handleSubmit}
            validate={validate}
        />
    );
}

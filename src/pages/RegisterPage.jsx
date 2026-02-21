import { useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.js';
import RegisterBox from "../components/RegisterBox";
import './LoginPage.css';

export default function RegisterPage() {
    const { token } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => { document.title = '회원가입 | Tolelog'; }, []);

    useEffect(() => {
        if (token) navigate('/', { replace: true });
    }, [token, navigate]);

    if (token) return null;

    return (
        <div className="auth-page">
            <RegisterBox/>
            <p className="signup-link">
                이미 계정이 있으신가요? <Link to="/login">로그인</Link>
            </p>
        </div>);
}

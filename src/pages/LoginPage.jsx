import { useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.js';
import LoginBox from "../components/LoginBox.jsx";
import './LoginPage.css';

export default function LoginPage() {
    const { token } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => { document.title = '로그인 | Tolelog'; }, []);

    useEffect(() => {
        if (token) navigate('/', { replace: true });
    }, [token, navigate]);

    if (token) return null;

    return (
        <div className="auth-page">
            <LoginBox/>
            <p className="signup-link">
                계정이 없으신가요? <Link to="/register">회원가입</Link>
            </p>
        </div>);
}

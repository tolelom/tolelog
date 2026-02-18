import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import LoginBox from "../components/LoginBox.jsx";
import './LoginPage.css';

export default function LoginPage() {
    useEffect(() => { document.title = '로그인 | Tolelog'; }, []);
    return (
        <div className="auth-page">
            <LoginBox/>
            <p className="signup-link">
                계정이 없으신가요? <Link to="/register">회원가입</Link>
            </p>
        </div>);
}
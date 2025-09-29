import { useNavigate } from 'react-router-dom';
import LoginBox from "../components/LoginBox.jsx";
import './LoginPage.css';

export default function LoginPage() {
    const navigate = useNavigate();

    return (
        <div>
            <LoginBox/>
            <div className="signup-link">
                계정이 없으신가요? <button onClick={() => navigate('/register')}>회원가입</button>
            </div>
        </div>);
}
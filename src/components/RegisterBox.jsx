import {useContext, useEffect, useRef, useState} from "react";
import {useNavigate, useLocation} from "react-router-dom";
import {AuthContext} from "../context/AuthContext.js";
import {AUTH_API} from "../utils/api.js";
import './AuthForm.css';


export default function RegisterBox() {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: '',
    });


    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const idRef = useRef();
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useContext(AuthContext);

    useEffect(() => {
        idRef.current?.focus();
    }, []);

    const handleChange = (e) => {
        const {name, value} = e.target;
        setFormData(prev => ({...prev, [name]: value}));
        if (errors[name]) {
            setErrors(prev => ({...prev, [name]: ''}));
        }
    }

    const validate = () => {
        const newErrors = {};
        if (!formData.username) {
            newErrors.username = "아이디를 입력해주세요.";
        } else if (formData.username.length < 3) {
            newErrors.username = "아이디는 3자 이상이어야 합니다.";
        } else if (formData.username.length > 20) {
            newErrors.username = "아이디는 20자 이하여야 합니다.";
        } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
            newErrors.username = "아이디는 영문, 숫자, 밑줄(_)만 사용 가능합니다.";
        }

        if (!formData.password) {
            newErrors.password = "비밀번호를 입력해주세요.";
        } else if (formData.password.length < 6) {
            newErrors.password = "비밀번호는 6자 이상이어야 합니다.";
        } else if (formData.password.length > 100) {
            newErrors.password = "비밀번호는 100자 이하여야 합니다.";
        }

        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = "비밀번호가 일치하지 않습니다.";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setIsLoading(true);

        try {
            const data = await AUTH_API.register(formData.username, formData.password);
            login({
                token: data.data.token,
                username: data.data.username,
                userId: data.data.user_id,
            });
            const from = location.state?.from?.pathname || '/';
            navigate(from, { replace: true });
        } catch (err) {
            setErrors({general: err.message || '네트워크 오류'});
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="auth-box">
            <h1>회원가입</h1>
            <form onSubmit={handleSubmit}>
                {errors.general && <div className="error general-error">{errors.general}</div>}
                <div className="input-group">
                    <label>아이디</label>
                    <input
                        ref={idRef}
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        className={errors.username ? 'invalid' : ''}
                    />
                    {errors.username && <small className="error">{errors.username}</small>}
                </div>
                <div className="input-group">
                    <label>비밀번호</label>
                    <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className={errors.password ? 'invalid' : ''}
                    />
                    {errors.password && <small className="error">{errors.password}</small>}
                </div>
                <div className="input-group">
                    <label>비밀번호 확인</label>
                    <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className={errors.confirmPassword ? 'invalid' : ''}
                    />
                    {errors.confirmPassword && <small className="error">{errors.confirmPassword}</small>}
                </div>
                <button type="submit" disabled={isLoading}>
                    {isLoading ? '가입 중...' : '회원가입'}
                </button>
            </form>
        </div>
    )
}
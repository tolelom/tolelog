import {useContext, useEffect, useRef, useState} from 'react';
import {useNavigate} from "react-router-dom";
import {AuthContext} from "../context/AuthContext.js";
import {API_BASE_URL} from "../utils/constants.js";


export default function LoginBox() {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
    })
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const idRef = useRef();
    const navigate = useNavigate();
    const { login } = useContext(AuthContext);

    const handleChange = (e) => {
        const {name, value} = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
        if (errors[name]) {
            setErrors((prev) => ({
                ...prev,
                [name]: '',
            }));
        }
    }

    const validate = () => {
        const newErrors = {};
        if (!formData.username) newErrors.username = "아이디를 입력해주세요.";
        if (!formData.password) newErrors.password = "비밀번호를 입력해주세요.";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setIsLoading(true);
        // TODO: API 호출
        try {
            const result = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(formData),
            });
            const data = await result.json();
            if (!result.ok) {
                setErrors({general: data.error || data.message});
            } else {
                login({
                    token: data.data.token,
                    username: data.data.username,
                    userId: data.data.user_id,
                });
                navigate('/');
            }
        } catch {
            setErrors({general: "네트워크 오류 발생"});
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        idRef.current?.focus();
    }, []);

    return (
        <div className="login-box">
            <h1>로그인</h1>
            {errors.general && <div className="error general-error">{errors.general}</div>}
            <form onSubmit={handleSubmit}>
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
                <button type="submit" disabled={isLoading}>
                    {isLoading ? '로그인 중...' : '로그인'}
                </button>
            </form>
        </div>
    );
}
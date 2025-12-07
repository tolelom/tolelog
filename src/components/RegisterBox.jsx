import {useContext, useEffect, useRef, useState} from "react";
import {useNavigate} from "react-router-dom";
import {AuthContext} from "../context/AuthContext.js";
import './RegisterBox.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function RegisterBox() {
    const {login} = useContext(AuthContext);
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: '',
    });

    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const idRef = useRef();

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
        if (!formData.username) newErrors.username = "아이디를 입력해주세요.";
        if (!formData.password) newErrors.password = "비밀번호를 입력해주세요";
        if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "비밀번호가 일치하지 않습니다.";
        if (formData.password && formData.password.length < 8) newErrors.password = "비밀번호는 8자 이상이어야 합니다.";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setIsLoading(true);

        try {
            const result = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    username: formData.username,
                    password: formData.password,
                }),
            });
            const data = await result.json();
            if (!result.ok) {
                setErrors({general: data.error || "회원가입에 실패했습니다"});
            } else if (data.status === 'success' && data.data) {
                console.log('회원가입 성공');
                // 자동 로그인
                login({
                    token: data.data.token,
                    username: data.data.username,
                    userId: data.data.user_id,
                });
                alert('회원가입 성공! 로그인되었습니다.');
                navigate('/');
            } else {
                setErrors({general: "회원가입 처리 중 오류가 발생했습니다"});
            }
        } catch (error) {
            console.error('Register error:', error);
            setErrors({general: "네트워크 오류 발생"});
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="register-box">
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

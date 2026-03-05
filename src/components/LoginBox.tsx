import React, { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { AUTH_API } from "../utils/api";
import './AuthForm.css';

interface LoginFormData {
    username: string;
    password: string;
}

interface LoginFormErrors {
    [key: string]: string;
}

export default function LoginBox() {
    const [formData, setFormData] = useState<LoginFormData>({
        username: '',
        password: '',
    });
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [errors, setErrors] = useState<LoginFormErrors>({});

    const idRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useContext(AuthContext);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
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
    };

    const validate = (): boolean => {
        const newErrors: LoginFormErrors = {};
        if (!formData.username) {
            newErrors.username = "아이디를 입력해주세요.";
        } else if (formData.username.length < 4) {
            newErrors.username = "아이디는 4자 이상이어야 합니다.";
        }

        if (!formData.password) {
            newErrors.password = "비밀번호를 입력해주세요.";
        } else if (formData.password.length < 6) {
            newErrors.password = "비밀번호는 6자 이상이어야 합니다.";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!validate()) return;
        setIsLoading(true);
        try {
            const data = await AUTH_API.login(formData.username, formData.password);
            login({
                token: data.data.access_token,
                refreshToken: data.data.refresh_token,
                username: data.data.username,
                userId: data.data.user_id,
                avatarUrl: data.data.avatar_url,
            });
            const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
            navigate(from, { replace: true });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : '네트워크 오류 발생';
            setErrors({ general: message });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        idRef.current?.focus();
    }, []);

    return (
        <div className="auth-box">
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

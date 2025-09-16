import {useEffect, useRef, useState} from 'react';
import {useNavigate} from "react-router-dom";


export default function LoginBox() {
    const [formData, setFormData] = useState({
        id: '',
        password: '',
    })
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const idRef = useRef();
    const navigate = useNavigate();

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
        if (!formData.id) newErrors.id = "아이디를 입력해주세요.";
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
            const result = await fetch("/api/login", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(formData),
            });
            const data = await result.json();
            if (!result.ok) {
                setErrors({general: data.message});
            } else {
                console.log("로그인 성공");
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
                        name="id"
                        value={formData.id}
                        onChange={handleChange}
                        className={errors.id ? 'invalid' : ''}
                    />
                    {errors.id && <small className="error">{errors.id}</small>}
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
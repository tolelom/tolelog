import { useEffect, useRef, useState } from 'react';
import './AuthForm.css';

export default function AuthForm({ title, fields, submitLabel, loadingLabel, onSubmit, validate }) {
    const [formData, setFormData] = useState(() => {
        const initial = {};
        fields.forEach(f => { initial[f.name] = ''; });
        return initial;
    });
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const firstInputRef = useRef();

    useEffect(() => {
        firstInputRef.current?.focus();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validationErrors = validate(formData);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
        setIsLoading(true);
        try {
            await onSubmit(formData);
        } catch (error) {
            setErrors({ general: error.message || '오류가 발생했습니다' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-box">
            <h1>{title}</h1>
            {errors.general && <div className="error general-error">{errors.general}</div>}
            <form onSubmit={handleSubmit}>
                {fields.map((field, index) => (
                    <div className="input-group" key={field.name}>
                        <label>{field.label}</label>
                        <input
                            ref={index === 0 ? firstInputRef : undefined}
                            type={field.type || 'text'}
                            name={field.name}
                            value={formData[field.name]}
                            onChange={handleChange}
                            className={errors[field.name] ? 'invalid' : ''}
                        />
                        {errors[field.name] && <small className="error">{errors[field.name]}</small>}
                    </div>
                ))}
                <button type="submit" disabled={isLoading}>
                    {isLoading ? loadingLabel : submitLabel}
                </button>
            </form>
        </div>
    );
}

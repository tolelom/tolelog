import React, { useEffect, useRef, useState } from 'react';
import './AuthForm.css';

interface AuthFormField {
    name: string;
    label: string;
    type?: string;
}

interface AuthFormErrors {
    [key: string]: string;
}

interface AuthFormProps {
    title: string;
    fields: AuthFormField[];
    submitLabel: string;
    loadingLabel: string;
    onSubmit: (formData: Record<string, string>) => Promise<void>;
    validate: (formData: Record<string, string>) => AuthFormErrors;
}

export default function AuthForm({ title, fields, submitLabel, loadingLabel, onSubmit, validate }: AuthFormProps) {
    const [formData, setFormData] = useState<Record<string, string>>(() => {
        const initial: Record<string, string> = {};
        fields.forEach(f => { initial[f.name] = ''; });
        return initial;
    });
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [errors, setErrors] = useState<AuthFormErrors>({});
    const firstInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        firstInputRef.current?.focus();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const validationErrors = validate(formData);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
        setIsLoading(true);
        try {
            await onSubmit(formData);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : '오류가 발생했습니다';
            setErrors({ general: message });
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

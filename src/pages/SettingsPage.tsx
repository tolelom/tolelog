import { useState, useContext, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { AUTH_API } from '../utils/api';
import './SettingsPage.css';

export default function SettingsPage() {
    const { token, username, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [deleteConfirm, setDeleteConfirm] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    useEffect(() => {
        document.title = '설정 | Tolelog';
    }, []);

    const validate = (): boolean => {
        const errors: Record<string, string> = {};
        if (!currentPassword) errors.currentPassword = '현재 비밀번호를 입력해주세요';
        if (!newPassword) {
            errors.newPassword = '새 비밀번호를 입력해주세요';
        } else if (newPassword.length < 6) {
            errors.newPassword = '비밀번호는 6자 이상이어야 합니다';
        }
        if (!confirmPassword) {
            errors.confirmPassword = '비밀번호 확인을 입력해주세요';
        } else if (newPassword !== confirmPassword) {
            errors.confirmPassword = '비밀번호가 일치하지 않습니다';
        }
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setMessage(null);
        if (!validate() || !token) return;

        setIsSubmitting(true);
        try {
            await AUTH_API.changePassword(currentPassword, newPassword, token);
            setMessage({ type: 'success', text: '비밀번호가 변경되었습니다' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setFieldErrors({});
        } catch (err) {
            setMessage({ type: 'error', text: err instanceof Error ? err.message : '비밀번호 변경에 실패했습니다' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!token || deleteConfirm !== username) return;
        setIsDeleting(true);
        setDeleteError(null);
        try {
            await AUTH_API.deleteAccount(token);
            logout();
            navigate('/');
        } catch (err) {
            setDeleteError(err instanceof Error ? err.message : '계정 삭제에 실패했습니다');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="settings-page">
            <h1 className="settings-title">설정</h1>

            {message && (
                <div className={`settings-message ${message.type === 'success' ? 'settings-message-success' : 'settings-message-error'}`}>
                    {message.text}
                </div>
            )}

            <div className="settings-section">
                <h2 className="settings-section-title">비밀번호 변경</h2>
                <form onSubmit={handleSubmit}>
                    <div className="settings-field">
                        <label className="settings-label" htmlFor="current-password">현재 비밀번호</label>
                        <input
                            id="current-password"
                            type="password"
                            className={`settings-input${fieldErrors.currentPassword ? ' settings-input-error' : ''}`}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            autoComplete="current-password"
                        />
                        {fieldErrors.currentPassword && <span className="settings-error">{fieldErrors.currentPassword}</span>}
                    </div>

                    <div className="settings-field">
                        <label className="settings-label" htmlFor="new-password">새 비밀번호</label>
                        <input
                            id="new-password"
                            type="password"
                            className={`settings-input${fieldErrors.newPassword ? ' settings-input-error' : ''}`}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            autoComplete="new-password"
                        />
                        {fieldErrors.newPassword && <span className="settings-error">{fieldErrors.newPassword}</span>}
                    </div>

                    <div className="settings-field">
                        <label className="settings-label" htmlFor="confirm-password">비밀번호 확인</label>
                        <input
                            id="confirm-password"
                            type="password"
                            className={`settings-input${fieldErrors.confirmPassword ? ' settings-input-error' : ''}`}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            autoComplete="new-password"
                        />
                        {fieldErrors.confirmPassword && <span className="settings-error">{fieldErrors.confirmPassword}</span>}
                    </div>

                    <button
                        type="submit"
                        className="btn btn-secondary settings-submit"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? '변경 중...' : '비밀번호 변경'}
                    </button>
                </form>
            </div>

            <div className="settings-delete-section">
                <h2 className="settings-section-title">계정 삭제</h2>
                <p className="settings-delete-warning">
                    계정을 삭제하면 모든 글과 댓글이 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
                </p>
                <div className="settings-field">
                    <label className="settings-label" htmlFor="delete-confirm">확인을 위해 사용자명을 입력하세요</label>
                    <input
                        id="delete-confirm"
                        type="text"
                        className="settings-input"
                        placeholder="확인을 위해 사용자명을 입력하세요"
                        value={deleteConfirm}
                        onChange={(e) => setDeleteConfirm(e.target.value)}
                        autoComplete="off"
                    />
                </div>
                {deleteError && <div className="settings-error">{deleteError}</div>}
                <button
                    type="button"
                    className="btn btn-danger settings-delete-btn"
                    disabled={deleteConfirm !== username || isDeleting}
                    onClick={handleDeleteAccount}
                >
                    {isDeleting ? '삭제 중...' : '계정 삭제'}
                </button>
            </div>
        </div>
    );
}

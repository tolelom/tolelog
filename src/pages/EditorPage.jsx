import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { POST_API } from '../utils/api';
import './EditorPage.css';

export default function EditorPage() {
    const navigate = useNavigate();
    const { token } = useContext(AuthContext);
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        is_public: true,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    // 마크다운을 HTML로 변환 (개선된 버전)
    const renderMarkdown = (text) => {
        if (!text) return '';

        return text
            // 제목
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            // 볼드
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // 이탤릭
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // 코드
            .replace(/`(.*?)`/g, '<code>$1</code>')
            // 줄바꿈
            .replace(/\n/g, '<br>');
    };

    const handleSave = async () => {
        if (!formData.title.trim()) {
            setError('제목을 입력해주세요');
            return;
        }
        if (!formData.content.trim()) {
            setError('내용을 입력해주세요');
            return;
        }
        if (!token) {
            setError('로그인이 필요합니다');
            navigate('/login');
            return;
        }

        setIsSaving(true);
        setError('');
        setSuccess('');

        try {
            const response = await POST_API.createPost(
                formData.title,
                formData.content,
                formData.is_public,
                token
            );

            if (!response.status || response.status !== 'success') {
                throw new Error(response.error || '글 저장에 실패했습니다');
            }

            setSuccess('글이 저장되었습니다!');
            // 2초 후 목록 페이지로 이동
            setTimeout(() => {
                navigate('/');
            }, 2000);

            // 폰 초기화
            setFormData({
                title: '',
                content: '',
                is_public: true,
            });
        } catch (err) {
            setError(err.message || '글 저장에 실패했습니다');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="editor-page">
            <h1>새 글 작성</h1>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <form className="editor-form" onSubmit={(e) => e.preventDefault()}>
                {/* 제목 입력 */}
                <div className="title-section">
                    <input
                        type="text"
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        placeholder="글 제목을 입력하세요..."
                        className="title-input"
                    />
                </div>

                <div className="editor-container">
                    {/* 외쪽: 편집기 */}
                    <div className="editor-section">
                        <label>내용</label>
                        <textarea
                            id="content"
                            name="content"
                            value={formData.content}
                            onChange={handleChange}
                            placeholder="# 제목&#10;## 부제목&#10;### 소제목&#10;&#10;**볼드**, *이탤릭*, `코드` 등 마크다운 문법을 사용하세요..."
                            rows="20"
                        />
                    </div>

                    {/* 오른쪽: 미리보기 */}
                    <div className="preview-section">
                        <label>미리보기</label>
                        <div
                            className="markdown-preview"
                            dangerouslySetInnerHTML={{
                                __html: renderMarkdown(formData.content) || '<p class="empty-preview">미리보기가 여기에 표시됩니다...</p>'
                            }}
                        />
                    </div>
                </div>

                {/* 버큼 섹션 */}
                <div className="button-section">
                    <div className="checkbox-group">
                        <label>
                            <input
                                type="checkbox"
                                name="is_public"
                                checked={formData.is_public}
                                onChange={handleChange}
                            />
                            공개 발행
                        </label>
                    </div>
                    <button
                        type="button"
                        className="save-button"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? '저장 중...' : '글 발행'}
                    </button>
                </div>
            </form>
        </div>
    );
}

import { useState } from 'react';
import './EditorPage.css';

export default function EditorPage() {
    const [formData, setFormData] = useState({
        content: '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    // 마크다운을 HTML로 변환 (개선된 버전)
    const renderMarkdown = (text) => {
        if (!text) return '';

        return text
            // 헤딩
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

    return (
        <div className="editor-page">
            <h1>새 글 작성</h1>

            <form className="editor-form">
                <div className="editor-container">
                    {/* 왼쪽: 편집기 */}
                    <div className="editor-section">
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
            </form>
        </div>
    );
}

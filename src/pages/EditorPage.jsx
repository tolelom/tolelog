import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { POST_API } from '../utils/api';
import { useAutoSave } from '../hooks/useAutoSave';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
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
    const [showRestorePrompt, setShowRestorePrompt] = useState(false);
    const [draftInfo, setDraftInfo] = useState(null);

    // 자동 저장 훅
    const { saveStatus, loadDraft, clearDraft, hasDraft, getFormattedSaveTime } = useAutoSave(formData);

    // marked 설정
    useEffect(() => {
        marked.setOptions({
            breaks: true,
            gfm: true,
            pedantic: false,
        });

        marked.use({
            async: false,
            pedantic: false,
            gfm: true,
            breaks: true,
            renderer: {
                code(code, language) {
                    const validLanguage = language && hljs.getLanguage(language) ? language : 'plaintext';
                    const highlighted = hljs.highlight(code, { language: validLanguage, ignoreIllegals: true }).value;
                    return `<pre><code class="hljs language-${validLanguage}">${highlighted}</code></pre>`;
                },
                codespan(code) {
                    return `<code class="inline-code">${code}</code>`;
                },
                link(href, title, text) {
                    return `<a href="${href}" title="${title || ''}" target="_blank" rel="noopener noreferrer">${text}</a>`;
                },
                image(href, title, text) {
                    return `<img src="${href}" alt="${text}" title="${title || ''}" style="max-width: 100%; height: auto;" />`;
                },
                table(header, body) {
                    return `<table class="markdown-table"><thead>${header}</thead><tbody>${body}</tbody></table>`;
                },
                blockquote(quote) {
                    return `<blockquote class="markdown-blockquote">${quote}</blockquote>`;
                },
                list(body, ordered) {
                    const tag = ordered ? 'ol' : 'ul';
                    return `<${tag} class="markdown-list">${body}</${tag}>`;
                },
                heading(text, level) {
                    return `<h${level} class="markdown-heading">${text}</h${level}>`;
                },
                paragraph(text) {
                    return `<p class="markdown-paragraph">${text}</p>`;
                }
            }
        });
    }, []);

    // 페이지 로드 시 백업 확인
    useEffect(() => {
        if (hasDraft()) {
            const draft = loadDraft();
            setDraftInfo(draft);
            setShowRestorePrompt(true);
        }
    }, []);

    const handleRestoreDraft = () => {
        const draft = loadDraft();
        if (draft) {
            setFormData({
                title: draft.title,
                content: draft.content,
                is_public: draft.is_public,
            });
        }
        setShowRestorePrompt(false);
    };

    const handleDiscardDraft = () => {
        clearDraft();
        setShowRestorePrompt(false);
        setDraftInfo(null);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    // 마크다운을 HTML로 변환
    const renderMarkdown = (text) => {
        if (!text) return '';
        try {
            return marked(text);
        } catch (err) {
            console.error('Markdown rendering error:', err);
            return '<p class="error-preview">마크다운 렌더링 오류</p>';
        }
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
            // 백업 초기화
            clearDraft();
            
            // 2초 후 목록 페이지로 이동
            setTimeout(() => {
                navigate('/');
            }, 2000);

            // 폼 초기화
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

            {/* 백업 복구 프롬프트 */}
            {showRestorePrompt && draftInfo && (
                <div className="restore-prompt">
                    <div className="restore-content">
                        <h3>저장된 임시 글이 있습니다</h3>
                        <p>마지막 저장: {getFormattedSaveTime()}</p>
                        <div className="restore-actions">
                            <button className="btn-restore" onClick={handleRestoreDraft}>
                                복구하기
                            </button>
                            <button className="btn-discard" onClick={handleDiscardDraft}>
                                버리기
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                    {/* 좌측: 편집기 */}
                    <div className="editor-section">
                        <label>마크다운 편집</label>
                        <textarea
                            id="content"
                            name="content"
                            value={formData.content}
                            onChange={handleChange}
                            placeholder={`# 제목\n## 부제목\n### 소제목\n\n**볼드**, *이탤릭*, ~~취소선~~\n\n\`\`\`javascript\nconst hello = () => {\n  console.log('Hello, World!');\n};\n\`\`\`\n\n- 리스트 1\n- 리스트 2\n  - 중첩 리스트\n\n> 인용문입니다\n\n[링크](https://example.com)\n\n![이미지](https://example.com/image.jpg)\n\n| 헤더1 | 헤더2 |\n|-------|-------|\n| 셀1   | 셀2   |`}
                            rows="20"
                        />
                    </div>

                    {/* 우측: 미리보기 */}
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

                {/* 버튼 섹션 */}
                <div className="button-section">
                    <div className="left-content">
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
                        <div className="save-indicator">
                            {saveStatus === 'saving' && (
                                <span className="save-status saving">저장 중...</span>
                            )}
                            {saveStatus === 'saved' && (
                                <span className="save-status saved">✓ 저장됨</span>
                            )}
                            {saveStatus === 'error' && (
                                <span className="save-status error">✗ 저장 실패</span>
                            )}
                        </div>
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

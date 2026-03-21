import { useState, useContext, useEffect, useRef, useCallback, useMemo, ChangeEvent, MutableRefObject } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { POST_API, SERIES_API, TAG_API } from '../utils/api';
import { TagInfo } from '../types';
import { STORAGE_KEYS } from '../utils/constants';
import { invalidateCache } from '../utils/apiCache';
import { useAutoSave } from '../hooks/useAutoSave';
import BlockEditor from '../components/BlockEditor';
import ImageUploadButton from '../components/ImageUploadButton';
import { renderMarkdown } from '../utils/markdown';
import { PostFormData, DraftData, Series } from '../types';
import 'highlight.js/styles/atom-one-dark.css';
import './EditorPage.css';

interface EditorRef {
    wrapSelection: (before: string, after: string) => void;
    getActiveTextarea: () => HTMLTextAreaElement | HTMLDivElement | null;
}

export default function EditorPage() {
    const navigate = useNavigate();
    const { postId } = useParams<{ postId: string }>();
    const { token, userId } = useContext(AuthContext);
    const imageInsertRef = useRef<((base64Data: string, fileName: string) => void) | null>(null);
    const editorRef = useRef<EditorRef | null>(null);
    const [formData, setFormData] = useState<PostFormData>({
        title: '',
        content: '',
        is_public: true,
        tags: '',
    });
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(!!postId);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');
    const [showRestorePrompt, setShowRestorePrompt] = useState<boolean>(false);
    const [draftInfo, setDraftInfo] = useState<DraftData | null>(null);
    const [userSeries, setUserSeries] = useState<Series[]>([]);
    const [selectedSeriesId, setSelectedSeriesId] = useState<string>('');
    const [showPreview, setShowPreview] = useState<boolean>(false);
    const previewContentRef = useRef<HTMLDivElement | null>(null);
    const [allTags, setAllTags] = useState<TagInfo[]>([]);
    const [tagSuggestions, setTagSuggestions] = useState<TagInfo[]>([]);
    const [showTagDropdown, setShowTagDropdown] = useState(false);
    const [activeTagIndex, setActiveTagIndex] = useState(-1);
    const tagInputRef = useRef<HTMLInputElement | null>(null);
    const tagDropdownRef = useRef<HTMLDivElement | null>(null);
    const isEditMode = !!postId;

    useEffect(() => {
        document.title = isEditMode ? '글 수정 | Tolelog' : '새 글 작성 | Tolelog';
    }, [isEditMode]);

    // 사용자의 시리즈 목록 로드
    useEffect(() => {
        if (!userId) return;
        const controller = new AbortController();
        SERIES_API.getUserSeries(userId, { signal: controller.signal })
            .then(res => { if (res.status === 'success') setUserSeries(res.data || []); })
            .catch(() => {});
        return () => controller.abort();
    }, [userId]);

    // 태그 목록 로드
    useEffect(() => {
        const controller = new AbortController();
        TAG_API.getTags({ signal: controller.signal })
            .then(res => { if (res.status === 'success') setAllTags(res.data || []); })
            .catch(() => {});
        return () => controller.abort();
    }, []);

    // 태그 자동완성 필터링
    const getCurrentTagInput = useCallback((): string => {
        const parts = formData.tags.split(',');
        return (parts[parts.length - 1] || '').trim();
    }, [formData.tags]);

    const filterTagSuggestions = useCallback((input: string) => {
        if (!input) {
            setTagSuggestions([]);
            setShowTagDropdown(false);
            return;
        }
        const existingTags = formData.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
        const filtered = allTags
            .filter(t => t.name.toLowerCase().includes(input.toLowerCase()) && !existingTags.includes(t.name.toLowerCase()))
            .slice(0, 8);
        setTagSuggestions(filtered);
        setShowTagDropdown(filtered.length > 0);
        setActiveTagIndex(-1);
    }, [allTags, formData.tags]);

    const handleTagSelect = useCallback((tagName: string) => {
        const parts = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
        parts.pop(); // remove incomplete current input
        parts.push(tagName);
        setFormData(prev => ({ ...prev, tags: parts.join(', ') + ', ' }));
        setShowTagDropdown(false);
        setActiveTagIndex(-1);
        tagInputRef.current?.focus();
    }, [formData.tags]);

    const handleTagInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        const parts = value.split(',');
        const currentInput = (parts[parts.length - 1] || '').trim();
        filterTagSuggestions(currentInput);
    }, [filterTagSuggestions]);

    const handleTagKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showTagDropdown || tagSuggestions.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveTagIndex(prev => (prev + 1) % tagSuggestions.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveTagIndex(prev => (prev <= 0 ? tagSuggestions.length - 1 : prev - 1));
        } else if (e.key === 'Enter' && activeTagIndex >= 0) {
            e.preventDefault();
            handleTagSelect(tagSuggestions[activeTagIndex].name);
        } else if (e.key === 'Escape') {
            setShowTagDropdown(false);
        }
    }, [showTagDropdown, tagSuggestions, activeTagIndex, handleTagSelect]);

    // Close tag dropdown on outside click
    useEffect(() => {
        if (!showTagDropdown) return;
        const handleClick = (e: MouseEvent) => {
            if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node) &&
                tagInputRef.current && !tagInputRef.current.contains(e.target as Node)) {
                setShowTagDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [showTagDropdown]);

    // 서버 draft 자동 저장 (새 글 작성 시에만)
    const serverDraftIdRef = useRef<number | null>(null);

    const handleServerSave = useCallback(async (data: PostFormData) => {
        if (!token) return;
        if (serverDraftIdRef.current) {
            await POST_API.saveDraft(serverDraftIdRef.current, data.title, data.content, data.tags || '', token);
        } else {
            const result = await POST_API.createDraft(data.title || '제목 없음', data.content, data.tags || '', token);
            serverDraftIdRef.current = result.data.id;
        }
    }, [token]);

    const serverSaveOptions = useMemo(() => ({
        enabled: !isEditMode && !!token,
        onSave: handleServerSave,
    }), [isEditMode, token, handleServerSave]);

    // 자동 저장 훅 (수정 모드는 별도 키로 저장)
    const draftKey = isEditMode ? STORAGE_KEYS.DRAFT_EDIT : STORAGE_KEYS.DRAFT;
    const { saveStatus, loadDraft, clearDraft, hasDraft, getFormattedSaveTime } = useAutoSave(formData, draftKey, serverSaveOptions);

    // 편집 중 페이지 이탈 경고
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (formData.title || formData.content) {
                e.preventDefault();
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [formData.title, formData.content]);

    // 모달 배경 스크롤 잠금
    useEffect(() => {
        document.body.style.overflow = showPreview ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [showPreview]);

    // 미리보기 Escape 닫기 + 코드 복사 버튼 이벤트 위임
    useEffect(() => {
        if (!showPreview) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setShowPreview(false);
        };
        window.addEventListener('keydown', handleKeyDown);

        const container = previewContentRef.current;
        if (!container) return () => window.removeEventListener('keydown', handleKeyDown);
        const handleClick = (e: Event) => {
            const btn = (e.target as HTMLElement).closest('.code-copy-btn') as HTMLElement | null;
            if (!btn) return;
            const code = btn.getAttribute('data-code')
                ?.replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'");
            if (code) {
                navigator.clipboard.writeText(code).then(() => {
                    btn.textContent = '복사됨!';
                    setTimeout(() => { btn.textContent = '복사'; }, 2000);
                }).catch(() => {
                    btn.textContent = '복사 실패';
                    setTimeout(() => { btn.textContent = '복사'; }, 2000);
                });
            }
        };
        container.addEventListener('click', handleClick);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            container.removeEventListener('click', handleClick);
        };
    }, [showPreview]);

    // 글 수정 모드: 기존 글 불러오기
    useEffect(() => {
        const controller = new AbortController();

        if (postId) {
            const loadPost = async () => {
                try {
                    setIsLoading(true);
                    const response = await POST_API.getPost(postId, { signal: controller.signal, token: token ?? undefined });
                    if (response.status === 'success') {
                        const post = response.data;
                        // 본인 글이 아니면 상세 페이지로 리다이렉트
                        if (userId && post.user_id !== userId) {
                            navigate(`/post/${postId}`, { replace: true });
                            return;
                        }
                        setFormData({
                            title: post.title,
                            content: post.content,
                            is_public: post.is_public,
                            tags: post.tags || '',
                        });
                        if (post.series) {
                            setSelectedSeriesId(String(post.series.series_id));
                        }
                        // 수정 모드 임시저장 확인
                        if (hasDraft()) {
                            const draft = loadDraft();
                            setDraftInfo(draft);
                            setShowRestorePrompt(true);
                        }
                    } else {
                        setError('글을 불러올 수 없습니다.');
                    }
                } catch (err: unknown) {
                    if (err instanceof Error && err.name === 'AbortError') return;
                    setError(err instanceof Error ? err.message : '글 불러오기에 실패했습니다.');
                } finally {
                    setIsLoading(false);
                }
            };
            loadPost();
        } else {
            // 신규 글 모드: 백업 확인
            if (hasDraft()) {
                const draft = loadDraft();
                setDraftInfo(draft);
                setShowRestorePrompt(true);
            }
            setIsLoading(false);
        }

        return () => controller.abort();
    }, [postId, hasDraft, loadDraft, navigate, userId]);

    const handleRestoreDraft = () => {
        if (draftInfo) {
            setFormData({
                title: draftInfo.title,
                content: draftInfo.content,
                is_public: draftInfo.is_public,
                tags: draftInfo.tags || '',
            });
        }
        setShowRestorePrompt(false);
    };

    const handleDiscardDraft = () => {
        clearDraft();
        setShowRestorePrompt(false);
        setDraftInfo(null);
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    // BlockEditor content 변경
    const handleContentChange = (newContent: string) => {
        setFormData((prev) => ({
            ...prev,
            content: newContent,
        }));
    };

    // 이미지 삽입 핸들러
    const handleImageInsert = (base64Data: string, fileName: string) => {
        if (imageInsertRef.current) {
            imageInsertRef.current(base64Data, fileName);
        }
    };

    // 툴바 포맷 버튼 핸들러
    const handleFormat = (type: string) => {
        if (!editorRef.current) return;
        switch (type) {
            case 'bold':
                editorRef.current.wrapSelection('**', '**');
                break;
            case 'italic':
                editorRef.current.wrapSelection('*', '*');
                break;
            case 'code':
                editorRef.current.wrapSelection('`', '`');
                break;
            case 'link':
                editorRef.current.wrapSelection('[', '](url)');
                break;
            case 'heading':
                editorRef.current.wrapSelection('## ', '');
                break;
            case 'strikethrough':
                editorRef.current.wrapSelection('~~', '~~');
                break;
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
            let response;
            if (isEditMode) {
                response = await POST_API.updatePost(
                    postId,
                    formData.title,
                    formData.content,
                    formData.is_public,
                    token,
                    formData.tags
                );
            } else {
                response = await POST_API.createPost(
                    formData.title,
                    formData.content,
                    formData.is_public,
                    token,
                    formData.tags
                );
            }

            if (response.status !== 'success') {
                throw new Error('글 저장에 실패했습니다');
            }

            const savedPostId = isEditMode ? Number(postId) : response.data?.id;

            // 시리즈에 추가/변경
            if (selectedSeriesId && savedPostId && token) {
                try {
                    await SERIES_API.addPost(selectedSeriesId, savedPostId, 0, token);
                } catch { /* 시리즈 추가 실패는 무시 */ }
            }

            // 홈 캐시 무효화
            invalidateCache('posts:');
            invalidateCache('search:');

            const successMsg = isEditMode ? '글이 수정되었습니다!' : '글이 저장되었습니다!';
            setSuccess(successMsg);
            clearDraft();

            const postIdToNavigate = savedPostId;
            setTimeout(() => navigate(`/post/${postIdToNavigate}`), 1500);
        } catch (err: unknown) {
            const apiErr = err as { status?: number; message?: string };
            if (apiErr.status === 401) {
                setError('로그인이 만료되었습니다. 다시 로그인해주세요.');
                navigate('/login');
                return;
            }
            setError(err instanceof Error ? err.message : '글 저장에 실패했습니다');
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        if (isEditMode) {
            navigate(`/post/${postId}`);
        } else {
            navigate('/');
        }
    };

    if (isLoading) {
        return (
            <div className="editor-page">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>글을 불러오는 중...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="editor-page">
            {/* 백업 복구 프롬프트 */}
            {showRestorePrompt && draftInfo && (
                <div className="restore-prompt" role="dialog" aria-modal="true" aria-label="임시 저장 복구" onKeyDown={(e) => { if (e.key === 'Escape') handleDiscardDraft(); }}>
                    <div className="restore-content">
                        <h3>{isEditMode ? '이전에 수정하던 내용이 있습니다' : '저장된 임시 글이 있습니다'}</h3>
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

                {/* 태그 입력 + 자동완성 */}
                <div className="tags-section">
                    <div className="tags-input-wrapper">
                        <input
                            ref={tagInputRef}
                            type="text"
                            name="tags"
                            value={formData.tags}
                            onChange={handleTagInputChange}
                            onKeyDown={handleTagKeyDown}
                            onFocus={() => { const cur = getCurrentTagInput(); if (cur) filterTagSuggestions(cur); }}
                            placeholder="태그를 쉼표로 구분하여 입력 (예: React, JavaScript, 블로그)"
                            className="tags-input"
                            autoComplete="off"
                        />
                        {showTagDropdown && tagSuggestions.length > 0 && (
                            <div className="tags-autocomplete" ref={tagDropdownRef}>
                                {tagSuggestions.map((t, i) => (
                                    <button
                                        key={t.name}
                                        type="button"
                                        className={`tags-autocomplete-item${i === activeTagIndex ? ' tags-autocomplete-item-active' : ''}`}
                                        onMouseDown={(e) => { e.preventDefault(); handleTagSelect(t.name); }}
                                    >
                                        <span className="tags-autocomplete-name">{t.name}</span>
                                        <span className="tags-autocomplete-count">{t.count}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {formData.tags && (
                        <div className="tags-preview">
                            {formData.tags.split(',').map((tag: string, i: number) => {
                                const trimmed = tag.trim();
                                return trimmed ? <span key={i} className="tag-chip">{trimmed}</span> : null;
                            })}
                        </div>
                    )}
                </div>

                {/* 시리즈 선택 */}
                {userSeries.length > 0 && (
                    <div className="series-section">
                        <select
                            className="series-select"
                            value={selectedSeriesId}
                            onChange={(e) => setSelectedSeriesId(e.target.value)}
                        >
                            <option value="">시리즈 없음</option>
                            {userSeries.map(s => (
                                <option key={s.id} value={String(s.id)}>{s.title}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* 에디터 툴바 */}
                <div className="editor-toolbar">
                    <div className="toolbar-format-buttons">
                        <button
                            type="button"
                            className="toolbar-btn"
                            onClick={() => handleFormat('heading')}
                            title="제목 (Heading)"
                        >
                            H
                        </button>
                        <button
                            type="button"
                            className="toolbar-btn toolbar-btn-bold"
                            onClick={() => handleFormat('bold')}
                            title="굵게 (Ctrl+B)"
                        >
                            B
                        </button>
                        <button
                            type="button"
                            className="toolbar-btn toolbar-btn-italic"
                            onClick={() => handleFormat('italic')}
                            title="기울임 (Ctrl+I)"
                        >
                            I
                        </button>
                        <button
                            type="button"
                            className="toolbar-btn toolbar-btn-strike"
                            onClick={() => handleFormat('strikethrough')}
                            title="취소선"
                        >
                            S
                        </button>
                        <button
                            type="button"
                            className="toolbar-btn toolbar-btn-code"
                            onClick={() => handleFormat('code')}
                            title="인라인 코드 (Ctrl+`)"
                        >
                            {'</>'}
                        </button>
                        <button
                            type="button"
                            className="toolbar-btn toolbar-btn-link"
                            onClick={() => handleFormat('link')}
                            title="링크 (Ctrl+K)"
                        >
                            🔗
                        </button>
                        <span className="toolbar-sep" />
                    </div>
                    <ImageUploadButton onImageInsert={handleImageInsert} />
                    <button
                        type="button"
                        className="toolbar-btn toolbar-btn-preview"
                        onClick={() => setShowPreview(true)}
                        title="미리보기"
                        disabled={!formData.content.trim()}
                    >
                        미리보기
                    </button>
                </div>

                {/* 블록 에디터 */}
                <BlockEditor
                    ref={editorRef}
                    content={formData.content}
                    onChange={handleContentChange}
                    onImageInsert={imageInsertRef}
                    token={token}
                />

                {/* 버튼 섹션 */}
                <div className="button-section">
                    <div className="left-content">
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                name="is_public"
                                checked={formData.is_public}
                                onChange={handleChange}
                            />
                            <span className="toggle-slider"></span>
                            <span className="toggle-label">
                                {formData.is_public ? '공개' : '비공개'}
                            </span>
                        </label>
                        <div className="save-indicator">
                            {saveStatus === 'saving' && (
                                <span className="save-status saving">저장 중...</span>
                            )}
                            {saveStatus === 'saved' && (
                                <span className="save-status saved">&#10003; 저장됨</span>
                            )}
                            {saveStatus === 'error' && (
                                <span className="save-status error">&#10007; 저장 실패</span>
                            )}
                        </div>
                    </div>
                    <div className="button-group">
                        <button
                            type="button"
                            className="cancel-button"
                            onClick={handleCancel}
                            disabled={isSaving}
                        >
                            취소
                        </button>
                        <button
                            type="button"
                            className="save-button"
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? (isEditMode ? '수정 중...' : '저장 중...') : (isEditMode ? '수정 완료' : '글 발행')}
                        </button>
                    </div>
                </div>
            </form>

            {/* 미리보기 모달 */}
            {showPreview && (
                <div className="preview-overlay" onClick={() => setShowPreview(false)} role="dialog" aria-modal="true" aria-label="미리보기">
                    <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="preview-header">
                            <h2 className="preview-title">{formData.title || '제목 없음'}</h2>
                            <button className="preview-close" onClick={() => setShowPreview(false)} aria-label="미리보기 닫기">
                                &times;
                            </button>
                        </div>
                        {formData.tags && (
                            <div className="preview-tags">
                                {formData.tags.split(',').map((tag: string, i: number) => {
                                    const trimmed = tag.trim();
                                    return trimmed ? <span key={i} className="tag-chip">{trimmed}</span> : null;
                                })}
                            </div>
                        )}
                        <div
                            ref={previewContentRef}
                            className="preview-body markdown-content md-body"
                            dangerouslySetInnerHTML={{
                                __html: renderMarkdown(formData.content)
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

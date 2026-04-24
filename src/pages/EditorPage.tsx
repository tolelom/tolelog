import { useState, useContext, useEffect, useRef, useCallback, useMemo, ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { POST_API, SERIES_API } from '../utils/api';
import { STORAGE_KEYS } from '../utils/constants';
import { invalidateCache } from '../utils/apiCache';
import { useAutoSave } from '../hooks/useAutoSave';
import { useToast } from '../hooks/useToast';
import BlockEditor from '../components/BlockEditor';
import TagAutocompleteInput from '../components/TagAutocompleteInput';
import EditorToolbar from '../components/EditorToolbar';
import PreviewModal from '../components/PreviewModal';
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
    const { toast } = useToast();
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
            toast.success(successMsg);
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
            const errMsg = err instanceof Error ? err.message : '글 저장에 실패했습니다';
            setError(errMsg);
            toast.error(errMsg);
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
                <TagAutocompleteInput
                    value={formData.tags}
                    onChange={(tags) => setFormData(prev => ({ ...prev, tags }))}
                />

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
                <EditorToolbar
                    onFormat={handleFormat}
                    onImageInsert={handleImageInsert}
                    onPreview={() => setShowPreview(true)}
                    previewDisabled={!formData.content.trim()}
                />

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
                <PreviewModal
                    title={formData.title}
                    content={formData.content}
                    tags={formData.tags}
                    onClose={() => setShowPreview(false)}
                />
            )}
        </div>
    );
}

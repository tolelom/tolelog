import { useState, useContext, useEffect, useRef, useCallback, useMemo, ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { POST_API, SERIES_API } from '../utils/api';
import { STORAGE_KEYS } from '../utils/constants';
import { invalidateCache } from '../utils/apiCache';
import { useAutoSave } from '../hooks/useAutoSave';
import { useToast } from '../hooks/useToast';
import { useReturnFocus } from '../hooks/useReturnFocus';
import { useKatexReady } from '../hooks/useKatexReady';
import PageMeta from '../components/PageMeta';
import { postPath } from '../utils/slug';
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

const EMPTY_FORM: PostFormData = { title: '', content: '', is_public: true, tags: '' };

export default function EditorPage() {
    const navigate = useNavigate();
    const { postId } = useParams<{ postId: string }>();
    const { token, userId } = useContext(AuthContext);
    const { toast } = useToast();
    const imageInsertRef = useRef<((base64Data: string, fileName: string) => void) | null>(null);
    const editorRef = useRef<EditorRef | null>(null);
    const [formData, setFormData] = useState<PostFormData>(EMPTY_FORM);
    // 불러온 글(새 글이면 빈 양식). 이것과 같으면 고친 게 없으므로 임시저장하지 않는다.
    const [baseline, setBaseline] = useState<PostFormData>(EMPTY_FORM);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(!!postId);
    const [error, setError] = useState<string>('');
    const [showRestorePrompt, setShowRestorePrompt] = useState<boolean>(false);
    const [draftInfo, setDraftInfo] = useState<DraftData | null>(null);
    const [userSeries, setUserSeries] = useState<Series[]>([]);
    const [selectedSeriesId, setSelectedSeriesId] = useState<string>('');
    const [showPreview, setShowPreview] = useState<boolean>(false);
    const isEditMode = !!postId;

    // 모달 닫을 때 트리거 버튼으로 포커스 복원 (a11y)
    useReturnFocus(showRestorePrompt);
    useReturnFocus(showPreview);

    // 미리보기에서 수식이 등장하면 KaTeX 로드 후 재렌더
    useKatexReady();

    // 사용자의 시리즈 목록 로드
    useEffect(() => {
        if (!userId) return;
        const controller = new AbortController();
        SERIES_API.getUserSeries(userId, { signal: controller.signal, token })
            .then(res => { if (res.status === 'success') setUserSeries(res.data || []); })
            .catch((err) => console.warn('editor: failed to load user series:', err));
        return () => controller.abort();
    }, [userId, token]);

    // 서버 draft 자동 저장 (새 글 작성 시에만). 발행할 때는 이 draft 를 발행해 고아 draft 를 남기지 않는다.
    const serverDraftIdRef = useRef<number | null>(null);
    const serverSaveInFlightRef = useRef<Promise<void> | null>(null);
    const isPublishingRef = useRef(false);

    const handleServerSave = useCallback(async (data: PostFormData) => {
        // 서버는 빈 본문을 거부하고, 발행 중에 draft 로 저장하면 발행한 글이 draft 로 되돌아간다
        if (!token || !data.content.trim() || isPublishingRef.current) return;
        const title = data.title.trim() || '제목 없음';
        const save = (async () => {
            if (serverDraftIdRef.current) {
                await POST_API.saveDraft(serverDraftIdRef.current, title, data.content, data.tags || '', token);
            } else {
                const result = await POST_API.createDraft(title, data.content, data.tags || '', token);
                serverDraftIdRef.current = result.data.id;
            }
        })();
        serverSaveInFlightRef.current = save;
        try {
            await save;
        } finally {
            if (serverSaveInFlightRef.current === save) serverSaveInFlightRef.current = null;
        }
    }, [token]);

    const serverSaveOptions = useMemo(() => ({
        enabled: !isEditMode && !!token,
        onSave: handleServerSave,
    }), [isEditMode, token, handleServerSave]);

    // 자동 저장 훅 (수정 모드는 별도 키로 저장)
    const draftKey = isEditMode ? `${STORAGE_KEYS.DRAFT_EDIT}:${postId}` : STORAGE_KEYS.DRAFT;
    const { saveStatus, loadDraft, clearDraft, hasDraft, getFormattedSaveTime } = useAutoSave(formData, draftKey, serverSaveOptions, baseline);

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
                            navigate(postPath(post), { replace: true });
                            return;
                        }
                        const loaded = {
                            title: post.title,
                            content: post.content,
                            is_public: post.is_public,
                            tags: post.tags || '',
                        };
                        setFormData(loaded);
                        setBaseline(loaded);
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
        isPublishingRef.current = true;

        try {
            // 진행 중인 자동저장이 draft 를 만들고 있으면 그 id 를 받은 뒤 발행한다
            await serverSaveInFlightRef.current?.catch(() => {});
            const targetPostId = isEditMode ? postId : serverDraftIdRef.current;

            let response;
            if (targetPostId) {
                response = await POST_API.updatePost(
                    targetPostId,
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

            const savedPostId = targetPostId ? Number(targetPostId) : response.data?.id;

            // 시리즈에 추가/변경
            if (selectedSeriesId && savedPostId && token) {
                try {
                    await SERIES_API.addPost(selectedSeriesId, savedPostId, 0, token);
                } catch { /* 시리즈 추가 실패는 무시 */ }
            }

            // 홈 캐시 무효화
            invalidateCache('posts:');
            invalidateCache('search:');

            const successMsg = isEditMode ? '글이 수정되었습니다' : '글이 저장되었습니다';
            toast.success(successMsg);
            clearDraft();

            const postIdToNavigate = savedPostId;
            const targetPath = postIdToNavigate
                ? postPath({ id: Number(postIdToNavigate), title: formData.title })
                : '/';
            // 토스트가 잠깐 보이도록 짧은 지연 후 이동
            setTimeout(() => navigate(targetPath), 800);
        } catch (err: unknown) {
            const apiErr = err as { status?: number; message?: string };
            isPublishingRef.current = false;
            if (apiErr.status === 401) {
                // 세션 만료 토스트는 api/client.ts(request)가 띄우므로 여기서는 이동만 한다
                navigate('/login');
                return;
            }
            const msg = err instanceof Error ? err.message : '글 저장에 실패했습니다';
            toast.error(msg);
            setError(msg); // 폼 영역에도 표시해 사용자가 입력값을 잃지 않게
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        if (isEditMode && postId) {
            // 현재 편집 중인 제목 기준으로 canonical URL 생성.
            // 만약 사용자가 제목을 수정했다가 취소한 경우 PostDetailPage 가 다시 정규화한다.
            navigate(postPath({ id: Number(postId), title: formData.title }));
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
            <PageMeta title={isEditMode ? '글 수정' : '새 글 작성'} noindex />
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

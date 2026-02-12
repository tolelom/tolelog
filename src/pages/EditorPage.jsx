import { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { POST_API } from '../utils/api';
import { useAutoSave } from '../hooks/useAutoSave';
import BlockEditor from '../components/BlockEditor';
import ImageUploadButton from '../components/ImageUploadButton';
import 'highlight.js/styles/atom-one-dark.css';
import './EditorPage.css';

export default function EditorPage() {
    const navigate = useNavigate();
    const { postId } = useParams();
    const { token } = useContext(AuthContext);
    const imageInsertRef = useRef(null);
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        is_public: true,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(!!postId);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showRestorePrompt, setShowRestorePrompt] = useState(false);
    const [draftInfo, setDraftInfo] = useState(null);
    const isEditMode = !!postId;

    // 자동 저장 훅
    const { saveStatus, loadDraft, clearDraft, hasDraft, getFormattedSaveTime } = useAutoSave(formData);

    // 글 수정 모드: 기존 글 불러오기
    useEffect(() => {
        if (postId) {
            const loadPost = async () => {
                try {
                    setIsLoading(true);
                    const response = await POST_API.getPost(postId);
                    if (response.status === 'success') {
                        const post = response.data;
                        setFormData({
                            title: post.title,
                            content: post.content,
                            is_public: post.is_public,
                        });
                    } else {
                        setError('글을 불러올 수 없습니다.');
                    }
                } catch (err) {
                    setError(err.message || '글 불러오기에 실패했습니다.');
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
    }, [postId]);

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

    // BlockEditor content 변경
    const handleContentChange = (newContent) => {
        setFormData((prev) => ({
            ...prev,
            content: newContent,
        }));
    };

    // 이미지 삽입 핸들러
    const handleImageInsert = (base64Data, fileName) => {
        if (imageInsertRef.current) {
            imageInsertRef.current(base64Data, fileName);
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
                    token
                );
            } else {
                response = await POST_API.createPost(
                    formData.title,
                    formData.content,
                    formData.is_public,
                    token
                );
            }

            if (!response.status || response.status !== 'success') {
                throw new Error(response.error || '글 저장에 실패했습니다');
            }

            const successMsg = isEditMode ? '글이 수정되었습니다!' : '글이 저장되었습니다!';
            setSuccess(successMsg);
            clearDraft();

            setTimeout(() => {
                const postIdToNavigate = isEditMode ? postId : response.data.id;
                navigate(`/post/${postIdToNavigate}`);
            }, 2000);
        } catch (err) {
            setError(err.message || '글 저장에 실패했습니다');
        } finally {
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
            <h1>{isEditMode ? '글 수정' : '새 글 작성'}</h1>

            {/* 백업 복구 프롬프트 */}
            {showRestorePrompt && draftInfo && !isEditMode && (
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

                {/* 에디터 툴바 */}
                <div className="editor-toolbar">
                    <ImageUploadButton onImageInsert={handleImageInsert} />
                </div>

                {/* 블록 에디터 */}
                <BlockEditor
                    content={formData.content}
                    onChange={handleContentChange}
                    onImageInsert={imageInsertRef}
                />

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
                            {!isEditMode && saveStatus === 'saving' && (
                                <span className="save-status saving">저장 중...</span>
                            )}
                            {!isEditMode && saveStatus === 'saved' && (
                                <span className="save-status saved">&#10003; 저장됨</span>
                            )}
                            {!isEditMode && saveStatus === 'error' && (
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
        </div>
    );
}

import ImageUploadButton from './ImageUploadButton';

interface EditorToolbarProps {
    onFormat: (type: string) => void;
    onImageInsert: (base64Data: string, fileName: string) => void;
    onPreview: () => void;
    previewDisabled: boolean;
}

export default function EditorToolbar({ onFormat, onImageInsert, onPreview, previewDisabled }: EditorToolbarProps) {
    return (
        <div className="editor-toolbar">
            <div className="toolbar-format-buttons">
                <button type="button" className="toolbar-btn" onClick={() => onFormat('heading')} title="제목 (Heading)">
                    H
                </button>
                <button type="button" className="toolbar-btn toolbar-btn-bold" onClick={() => onFormat('bold')} title="굵게 (Ctrl+B)">
                    B
                </button>
                <button type="button" className="toolbar-btn toolbar-btn-italic" onClick={() => onFormat('italic')} title="기울임 (Ctrl+I)">
                    I
                </button>
                <button type="button" className="toolbar-btn toolbar-btn-strike" onClick={() => onFormat('strikethrough')} title="취소선">
                    S
                </button>
                <button type="button" className="toolbar-btn toolbar-btn-code" onClick={() => onFormat('code')} title="인라인 코드 (Ctrl+`)">
                    {'</>'}
                </button>
                <button type="button" className="toolbar-btn toolbar-btn-link" onClick={() => onFormat('link')} title="링크 (Ctrl+K)">
                    🔗
                </button>
                <span className="toolbar-sep" />
            </div>
            <ImageUploadButton onImageInsert={onImageInsert} />
            <button
                type="button"
                className="toolbar-btn toolbar-btn-preview"
                onClick={onPreview}
                title="미리보기"
                disabled={previewDisabled}
            >
                미리보기
            </button>
        </div>
    );
}

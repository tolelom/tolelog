import React, { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { parseBlocks, renderBlock } from '../utils/markdownParser';
import { validateImageFile, compressImage, uploadImageToServer } from '../utils/imageUpload';
import { useCopyCodeBlock } from '../hooks/useCopyCodeBlock';
import DOMPurify from 'dompurify';
import './BlockEditor.css';
import type { Block } from '../types';

// Internal block representation used by the editor
interface EditorBlock {
    raw: string;
    type: string;
    id: string;
    alt?: string;
    src?: string;
    width?: string | null;
}

export interface BlockEditorHandle {
    wrapSelection: (before: string, after: string) => void;
    getActiveTextarea: () => HTMLTextAreaElement | HTMLDivElement | null;
}

interface BlockEditorProps {
    content: string;
    onChange: (raw: string) => void;
    onImageInsert?: React.MutableRefObject<((base64Data: string, fileName: string) => void) | null>;
    token?: string | null;
}

interface SizeOption {
    label: string;
    value: string | null;
}

function genBlockId(): string { return crypto.randomUUID(); }

function startImageDrag(
    startX: number,
    index: number,
    wrapperEl: HTMLElement,
    handleImageResize: (index: number, widthValue: string | null) => void
) {
    const editorEl = wrapperEl.closest('.block-image-editor') as HTMLElement | null;
    const availableWidth = editorEl ? editorEl.getBoundingClientRect().width : 0;
    if (!availableWidth) return;

    const startWidthPx = wrapperEl.getBoundingClientRect().width;
    const calcPct = (currentX: number): number => {
        const newWidthPx = Math.max(startWidthPx + (currentX - startX), 40);
        return Math.min(Math.round((newWidthPx / availableWidth) * 100), 100);
    };

    const onMouseMove = (e: MouseEvent) => { wrapperEl.style.width = `${calcPct(e.clientX)}%`; };
    const onMouseUp = (e: MouseEvent) => {
        handleImageResize(index, `${calcPct(e.clientX)}%`);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
    };

    const onTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        wrapperEl.style.width = `${calcPct(e.touches[0].clientX)}%`;
    };
    const onTouchEnd = (e: TouchEvent) => {
        handleImageResize(index, `${calcPct(e.changedTouches[0].clientX)}%`);
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onTouchEnd);
    };

    document.body.style.cursor = 'col-resize';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
}

const SIZE_OPTIONS: SizeOption[] = [
    { label: '작게', value: '25%' },
    { label: '보통', value: '50%' },
    { label: '크게', value: '75%' },
    { label: '원본', value: null },
];

const BlockEditor = forwardRef<BlockEditorHandle, BlockEditorProps>(function BlockEditor({ content, onChange, onImageInsert, token }, ref) {
    const [blocks, setBlocks] = useState<EditorBlock[]>(() => initBlocks(content));
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const [isDragOver, setIsDragOver] = useState<boolean>(false);
    const [uploadError, setUploadError] = useState<string>('');
    const textareaRefs = useRef<Record<number, HTMLTextAreaElement | HTMLDivElement | null>>({});
    const containerRef = useRef<HTMLDivElement>(null);
    const isInternalChange = useRef<boolean>(false);
    const pendingCursorPos = useRef<number | null>(null);

    // 외부 content 변경 시 blocks 동기화 (외부에서만)
    useEffect(() => {
        if (isInternalChange.current) {
            isInternalChange.current = false;
            return;
        }
        setBlocks(initBlocks(content));
    }, [content]);

    // 활성 블록에 포커스 + 커서 위치 복원
    useEffect(() => {
        if (activeIndex !== null && textareaRefs.current[activeIndex]) {
            const el = textareaRefs.current[activeIndex]!;
            el.focus();
            if (el.tagName === 'TEXTAREA') {
                const textarea = el as HTMLTextAreaElement;
                if (pendingCursorPos.current !== null) {
                    textarea.selectionStart = pendingCursorPos.current;
                    textarea.selectionEnd = pendingCursorPos.current;
                    pendingCursorPos.current = null;
                }
                autoResize(textarea);
            }
        }
    }, [activeIndex, blocks]);

    // blocks -> raw markdown -> onChange
    const emitChange = useCallback((newBlocks: EditorBlock[]) => {
        isInternalChange.current = true;
        const raw = newBlocks.map(b => b.raw).join('\n\n');
        onChange(raw);
    }, [onChange]);

    const handleImageResize = useCallback((index: number, widthValue: string | null) => {
        setBlocks(prev => {
            const newBlocks = [...prev];
            const block = newBlocks[index];
            const match = block.raw.match(/^(!\[([^\]]*)\]\(([^)]+)\))(?:\{width=[^}]+\})?$/);
            if (!match) return prev;
            const newRaw = widthValue ? `${match[1]}{width=${widthValue}}` : match[1];
            newBlocks[index] = { ...block, raw: newRaw, width: widthValue };
            emitChange(newBlocks);
            return newBlocks;
        });
    }, [emitChange]);

    const handleResizeMouseDown = useCallback((e: React.MouseEvent, index: number) => {
        e.preventDefault();
        e.stopPropagation();
        const wrapperEl = (e.currentTarget as HTMLElement).closest('.image-resize-wrapper') as HTMLElement | null;
        if (wrapperEl) startImageDrag(e.clientX, index, wrapperEl, handleImageResize);
    }, [handleImageResize]);

    const handleResizeTouchStart = useCallback((e: React.TouchEvent, index: number) => {
        e.preventDefault();
        e.stopPropagation();
        const wrapperEl = (e.currentTarget as HTMLElement).closest('.image-resize-wrapper') as HTMLElement | null;
        if (wrapperEl) startImageDrag(e.touches[0].clientX, index, wrapperEl, handleImageResize);
    }, [handleImageResize]);

    const updateBlock = useCallback((index: number, newRaw: string) => {
        setBlocks(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], raw: newRaw };
            emitChange(updated);
            return updated;
        });
    }, [emitChange]);

    // 선택 텍스트를 마크다운 문법으로 감싸기
    const wrapSelection = useCallback((before: string, after: string) => {
        if (activeIndex === null) return;
        const ta = textareaRefs.current[activeIndex] as HTMLTextAreaElement | null;
        if (!ta) return;

        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const text = ta.value;
        const selected = text.slice(start, end);
        const newText = text.slice(0, start) + before + selected + after + text.slice(end);
        updateBlock(activeIndex, newText);

        // 커서 위치 복원
        requestAnimationFrame(() => {
            ta.focus();
            if (selected) {
                ta.selectionStart = start + before.length;
                ta.selectionEnd = end + before.length;
            } else {
                ta.selectionStart = start + before.length;
                ta.selectionEnd = start + before.length;
            }
        });
    }, [activeIndex, updateBlock]);

    // 외부에서 호출 가능한 메서드 노출
    useImperativeHandle(ref, () => ({
        wrapSelection,
        getActiveTextarea: () => activeIndex !== null ? textareaRefs.current[activeIndex] ?? null : null,
    }), [wrapSelection, activeIndex]);

    // 블록 클릭 -> 활성화
    const handleBlockClick = (index: number) => {
        setActiveIndex(index);
    };

    // 빈 영역 클릭 -> 마지막 블록이 비어있으면 활성화, 아니면 새 블록 추가
    const handleEmptyClick = () => {
        setBlocks(prev => {
            const lastBlock = prev[prev.length - 1];
            if (lastBlock && lastBlock.raw.trim() === '') {
                setActiveIndex(prev.length - 1);
                return prev;
            }
            const newBlocks = [...prev, { raw: '', type: 'paragraph', id: genBlockId() }];
            setActiveIndex(newBlocks.length - 1);
            emitChange(newBlocks);
            return newBlocks;
        });
    };

    // 키보드 핸들러
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, index: number) => {
        const ta = textareaRefs.current[index] as HTMLTextAreaElement | null;
        const raw = blocks[index]?.raw || '';

        // 코드 블록 감지
        const isCodeBlock = raw.trimStart().startsWith('```');

        // 포맷 단축키 (Ctrl/Cmd + key)
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'b':
                    e.preventDefault();
                    wrapSelection('**', '**');
                    return;
                case 'i':
                    e.preventDefault();
                    wrapSelection('*', '*');
                    return;
                case 'k':
                    e.preventDefault();
                    wrapSelection('[', '](url)');
                    return;
                case '`':
                    e.preventDefault();
                    wrapSelection('`', '`');
                    return;
            }
        }

        // 코드 블록에서 마지막 줄이 빈 줄일 때 Enter -> 코드 블록 탈출
        if (e.key === 'Enter' && !e.shiftKey && isCodeBlock) {
            const cursorPos = ta ? ta.selectionStart : raw.length;
            const lines = raw.slice(0, cursorPos).split('\n');
            const lastLine = lines[lines.length - 1];
            // 커서가 맨 끝에 있고, 마지막 줄이 빈 줄이면 탈출
            if (cursorPos === raw.length && lastLine.trim() === '' && lines.length > 1) {
                e.preventDefault();
                // 빈 마지막 줄 제거
                const trimmedRaw = lines.slice(0, -1).join('\n');
                setBlocks(prev => {
                    const newBlocks = [...prev];
                    newBlocks[index] = { ...newBlocks[index], raw: trimmedRaw };
                    newBlocks.splice(index + 1, 0, { raw: '', type: 'paragraph', id: genBlockId() });
                    pendingCursorPos.current = 0;
                    setActiveIndex(index + 1);
                    emitChange(newBlocks);
                    return newBlocks;
                });
                return;
            }
        }

        if (e.key === 'Enter' && !e.shiftKey && !isCodeBlock) {
            e.preventDefault();
            const cursorPos = ta ? ta.selectionStart : raw.length;
            const beforeCursor = raw.slice(0, cursorPos);
            const afterCursor = raw.slice(cursorPos);
            setBlocks(prev => {
                const newBlocks = [...prev];
                newBlocks[index] = { ...newBlocks[index], raw: beforeCursor };
                newBlocks.splice(index + 1, 0, { raw: afterCursor, type: 'paragraph', id: genBlockId() });
                pendingCursorPos.current = 0;
                setActiveIndex(index + 1);
                emitChange(newBlocks);
                return newBlocks;
            });
            return;
        }

        // Backspace: 첫 번째 빈 블록 삭제
        if (e.key === 'Backspace' && raw === '' && index === 0 && blocks.length > 1) {
            e.preventDefault();
            setBlocks(prev => {
                const newBlocks = prev.filter((_, i) => i !== 0);
                setActiveIndex(0);
                emitChange(newBlocks);
                return newBlocks;
            });
            return;
        }

        // Backspace: 블록 시작에서 이전 블록과 병합 (빈 블록 삭제 포함)
        if (e.key === 'Backspace' && ta && ta.selectionStart === 0 && ta.selectionEnd === 0 && index > 0) {
            e.preventDefault();
            setBlocks(prev => {
                const newBlocks = [...prev];
                const prevBlock = newBlocks[index - 1];
                const currBlock = newBlocks[index];
                const prevLen = prevBlock.raw.length;
                newBlocks[index - 1] = { ...prevBlock, raw: prevBlock.raw + currBlock.raw };
                newBlocks.splice(index, 1);
                pendingCursorPos.current = prevLen;
                setActiveIndex(index - 1);
                emitChange(newBlocks);
                return newBlocks;
            });
            return;
        }

        // ArrowUp: 블록 시작에서 이전 블록으로
        if (e.key === 'ArrowUp' && ta && ta.selectionStart === 0 && index > 0) {
            e.preventDefault();
            setActiveIndex(index - 1);
            return;
        }

        // ArrowDown: 블록 끝에서 다음 블록으로
        if (e.key === 'ArrowDown' && ta && ta.selectionStart === ta.value.length && index < blocks.length - 1) {
            e.preventDefault();
            setActiveIndex(index + 1);
            return;
        }
    };

    // textarea 내용 변경
    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>, index: number) => {
        const newRaw = e.target.value;
        updateBlock(index, newRaw);
        autoResize(e.target);
    };

    // 외부에서 이미지 삽입 시 호출할 함수 노출
    const insertImage = useCallback((base64Data: string, fileName: string) => {
        const markdownImage = `![${fileName}](${base64Data})`;
        setBlocks(prev => {
            const insertAt = activeIndex !== null ? activeIndex + 1 : prev.length;
            const newBlocks = [...prev];
            newBlocks.splice(insertAt, 0, {
                raw: markdownImage,
                type: 'image',
                id: genBlockId(),
                alt: fileName,
                src: base64Data,
            });
            setActiveIndex(null);
            emitChange(newBlocks);
            return newBlocks;
        });
    }, [activeIndex, emitChange]);

    // onImageInsert 콜백에 insertImage 연결
    useEffect(() => {
        if (onImageInsert) {
            onImageInsert.current = insertImage;
        }
    }, [insertImage, onImageInsert]);

    // 코드 블록 복사 버튼 이벤트 위임
    useCopyCodeBlock(containerRef);

    // 드래그 앤 드롭 핸들러
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(true);
    };
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        if (!containerRef.current?.contains(e.relatedTarget as Node)) {
            setIsDragOver(false);
        }
    };
    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(false);
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        if (files.length === 0) return;

        for (const file of files) {
            const validation = validateImageFile(file);
            if (!validation.valid) {
                setUploadError(validation.error || '유효하지 않은 이미지입니다.');
                continue;
            }
            try {
                setUploadError('');
                const compressed = await compressImage(file);
                if (token) {
                    const url = await uploadImageToServer(compressed, token);
                    insertImage(url, file.name);
                } else {
                    // 토큰 없으면 Base64 폴백
                    const reader = new FileReader();
                    reader.onload = (ev) => insertImage((ev.target as FileReader).result as string, file.name);
                    reader.readAsDataURL(compressed);
                }
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : '이미지 업로드 실패';
                setUploadError('이미지 업로드 실패: ' + message);
            }
        }
    };

    return (
        <div
            className={`block-editor ${isDragOver ? 'drag-over' : ''}`}
            ref={containerRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {uploadError && (
                <div className="block-upload-error" role="alert">
                    {uploadError}
                    <button className="block-upload-error-close" onClick={() => setUploadError('')} aria-label="오류 닫기">×</button>
                </div>
            )}
            {blocks.map((block, index) => {
                const isActive = activeIndex === index;
                const imgMatch = isActive
                    ? block.raw.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)(\{width=([^}]+)\})?$/)
                    : null;
                return (
                    <div key={block.id || index} className={`block-wrapper ${isActive ? 'active' : ''}`}>
                        {imgMatch ? (
                            <div
                                ref={el => { textareaRefs.current[index] = el; }}
                                tabIndex={0}
                                className="block-image-editor"
                                onBlur={(e) => {
                                    if (containerRef.current && containerRef.current.contains(e.relatedTarget as Node)) return;
                                    setTimeout(() => { setActiveIndex(prev => prev === index ? null : prev); }, 100);
                                }}
                            >
                                <div
                                    className="image-resize-wrapper"
                                    style={imgMatch[4] ? { width: imgMatch[4] } : {}}
                                >
                                    <img
                                        src={imgMatch[2]}
                                        alt={imgMatch[1]}
                                        draggable={false}
                                    />
                                    <div
                                        className="image-resize-handle"
                                        role="slider"
                                        tabIndex={0}
                                        aria-label="이미지 크기 조절"
                                        aria-valuetext={imgMatch[4] || '원본'}
                                        onMouseDown={(e) => handleResizeMouseDown(e, index)}
                                        onTouchStart={(e) => handleResizeTouchStart(e, index)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                                                e.preventDefault();
                                                const currentWidth = parseInt(imgMatch![4] || '100', 10);
                                                const delta = e.key === 'ArrowRight' ? 5 : -5;
                                                const newWidth = Math.max(10, Math.min(100, currentWidth + delta));
                                                handleImageResize(index, `${newWidth}%`);
                                            }
                                        }}
                                    />
                                </div>
                                <div className="image-resize-controls">
                                    {SIZE_OPTIONS.map(opt => (
                                        <button
                                            key={opt.label}
                                            className={`image-resize-btn ${(imgMatch[4] || null) === opt.value ? 'active' : ''}`}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                handleImageResize(index, opt.value);
                                            }}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                    <span className="image-size-label">{imgMatch[4] || '원본'}</span>
                                </div>
                            </div>
                        ) : isActive ? (
                            <textarea
                                ref={el => { textareaRefs.current[index] = el; }}
                                className="block-textarea"
                                value={block.raw}
                                onChange={(e) => handleInput(e, index)}
                                onKeyDown={(e) => handleKeyDown(e, index)}
                                onBlur={(e) => {
                                    if (containerRef.current && containerRef.current.contains(e.relatedTarget as Node)) {
                                        return;
                                    }
                                    setTimeout(() => {
                                        setActiveIndex(prev => prev === index ? null : prev);
                                    }, 100);
                                }}
                                placeholder="내용을 입력하세요..."
                                rows={1}
                            />
                        ) : (
                            <div
                                className="block-rendered md-body"
                                onClick={() => handleBlockClick(index)}
                                dangerouslySetInnerHTML={{
                                    __html: renderBlockSafe(block)
                                }}
                            />
                        )}
                    </div>
                );
            })}
            <div className="block-empty-area" onClick={handleEmptyClick}>
                {blocks.length === 0 && (
                    <span className="block-placeholder">여기를 클릭하여 글을 작성하세요...</span>
                )}
            </div>
        </div>
    );
});

export default BlockEditor;

// 초기 블록 생성
function initBlocks(content: string): EditorBlock[] {
    if (!content || content.trim() === '') {
        return [{ raw: '', type: 'paragraph', id: genBlockId() }];
    }
    const parsed = parseBlocks(content);
    if (parsed.length === 0) {
        return [{ raw: '', type: 'paragraph', id: genBlockId() }];
    }
    return parsed.map((b: Block) => ({ ...b, id: genBlockId() }));
}

// 안전한 블록 렌더링 (빈 블록 처리 + XSS 방어)
function renderBlockSafe(block: EditorBlock): string {
    if (!block.raw || block.raw.trim() === '') {
        return '<p class="block-empty-text">&nbsp;</p>';
    }
    const parsed = parseBlocks(block.raw);
    let html: string;
    if (parsed.length > 0) {
        html = parsed.map(renderBlock).join('\n');
    } else {
        html = renderBlock(block as unknown as Block);
    }
    return DOMPurify.sanitize(html);
}

// textarea 자동 높이 조절
function autoResize(textarea: HTMLTextAreaElement): void {
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

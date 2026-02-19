import { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { parseBlocks, renderBlock } from '../utils/markdownParser';
import { validateImageFile, compressImage, uploadImageToServer } from '../utils/imageUpload';
import DOMPurify from 'dompurify';
import './BlockEditor.css';

let nextBlockId = 1;
function genBlockId() { return `blk-${nextBlockId++}`; }

const SIZE_OPTIONS = [
    { label: '작게', value: '25%' },
    { label: '보통', value: '50%' },
    { label: '크게', value: '75%' },
    { label: '원본', value: null },
];

const BlockEditor = forwardRef(function BlockEditor({ content, onChange, onImageInsert, token }, ref) {
    const [blocks, setBlocks] = useState(() => initBlocks(content));
    const [activeIndex, setActiveIndex] = useState(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const textareaRefs = useRef({});
    const containerRef = useRef(null);
    const isInternalChange = useRef(false);
    const pendingCursorPos = useRef(null);

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
            const el = textareaRefs.current[activeIndex];
            el.focus();
            if (el.tagName === 'TEXTAREA') {
                if (pendingCursorPos.current !== null) {
                    el.selectionStart = pendingCursorPos.current;
                    el.selectionEnd = pendingCursorPos.current;
                    pendingCursorPos.current = null;
                }
                autoResize(el);
            }
        }
    }, [activeIndex, blocks]);

    // blocks → raw markdown → onChange
    const emitChange = useCallback((newBlocks) => {
        isInternalChange.current = true;
        const raw = newBlocks.map(b => b.raw).join('\n\n');
        onChange(raw);
    }, [onChange]);

    const handleImageResize = useCallback((index, widthValue) => {
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

    const handleResizeMouseDown = useCallback((e, index) => {
        e.preventDefault();
        e.stopPropagation();

        const wrapperEl = e.currentTarget.closest('.image-resize-wrapper');
        if (!wrapperEl) return;

        const editorEl = wrapperEl.closest('.block-image-editor');
        const availableWidth = editorEl ? editorEl.getBoundingClientRect().width : 0;
        if (!availableWidth) return;

        const startX = e.clientX;
        const startWidthPx = wrapperEl.getBoundingClientRect().width;

        const onMouseMove = (moveEvent) => {
            const dx = moveEvent.clientX - startX;
            const newWidthPx = Math.max(startWidthPx + dx, 40);
            const newWidthPct = Math.min(Math.round((newWidthPx / availableWidth) * 100), 100);
            wrapperEl.style.width = `${newWidthPct}%`;
        };

        const onMouseUp = (upEvent) => {
            const dx = upEvent.clientX - startX;
            const newWidthPx = Math.max(startWidthPx + dx, 40);
            const newWidthPct = Math.min(Math.round((newWidthPx / availableWidth) * 100), 100);
            handleImageResize(index, `${newWidthPct}%`);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = '';
        };

        document.body.style.cursor = 'col-resize';
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }, [handleImageResize]);

    const updateBlock = useCallback((index, newRaw) => {
        setBlocks(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], raw: newRaw };
            emitChange(updated);
            return updated;
        });
    }, [emitChange]);

    // 선택 텍스트를 마크다운 문법으로 감싸기
    const wrapSelection = useCallback((before, after) => {
        if (activeIndex === null) return;
        const ta = textareaRefs.current[activeIndex];
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
        getActiveTextarea: () => activeIndex !== null ? textareaRefs.current[activeIndex] : null,
    }), [wrapSelection, activeIndex]);

    // 블록 클릭 → 활성화
    const handleBlockClick = (index) => {
        setActiveIndex(index);
    };

    // 빈 영역 클릭 → 마지막 블록이 비어있으면 활성화, 아니면 새 블록 추가
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
    const handleKeyDown = (e, index) => {
        const ta = textareaRefs.current[index];
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

        // 코드 블록에서 마지막 줄이 빈 줄일 때 Enter → 코드 블록 탈출
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
    const handleInput = (e, index) => {
        const newRaw = e.target.value;
        updateBlock(index, newRaw);
        autoResize(e.target);
    };

    // 외부에서 이미지 삽입 시 호출할 함수 노출
    const insertImage = useCallback((base64Data, fileName) => {
        const markdownImage = `![${fileName}](${base64Data})`;
        setBlocks(prev => {
            const insertAt = activeIndex !== null ? activeIndex + 1 : prev.length;
            const newBlocks = [...prev];
            newBlocks.splice(insertAt, 0, {
                raw: markdownImage,
                type: 'image',
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
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const handleClick = (e) => {
            const btn = e.target.closest('.code-copy-btn');
            if (!btn) return;
            e.stopPropagation();
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
        return () => container.removeEventListener('click', handleClick);
    }, []);

    // 드래그 앤 드롭 핸들러
    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };
    const handleDragLeave = (e) => {
        if (!containerRef.current?.contains(e.relatedTarget)) {
            setIsDragOver(false);
        }
    };
    const handleDrop = async (e) => {
        e.preventDefault();
        setIsDragOver(false);
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        if (files.length === 0) return;

        for (const file of files) {
            const validation = validateImageFile(file);
            if (!validation.valid) {
                alert(validation.error);
                continue;
            }
            try {
                const compressed = await compressImage(file);
                if (token) {
                    const url = await uploadImageToServer(compressed, token);
                    insertImage(url, file.name);
                } else {
                    // 토큰 없으면 Base64 폴백
                    const reader = new FileReader();
                    reader.onload = (ev) => insertImage(ev.target.result, file.name);
                    reader.readAsDataURL(compressed);
                }
            } catch (err) {
                alert('이미지 업로드 실패: ' + err.message);
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
                                    if (containerRef.current && containerRef.current.contains(e.relatedTarget)) return;
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
                                        style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '8px' }}
                                        draggable={false}
                                    />
                                    <div
                                        className="image-resize-handle"
                                        onMouseDown={(e) => handleResizeMouseDown(e, index)}
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
                                    if (containerRef.current && containerRef.current.contains(e.relatedTarget)) {
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
                                className="block-rendered"
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
function initBlocks(content) {
    if (!content || content.trim() === '') {
        return [{ raw: '', type: 'paragraph', id: genBlockId() }];
    }
    const parsed = parseBlocks(content);
    if (parsed.length === 0) {
        return [{ raw: '', type: 'paragraph', id: genBlockId() }];
    }
    return parsed.map(b => ({ ...b, id: genBlockId() }));
}

// 안전한 블록 렌더링 (빈 블록 처리 + XSS 방어)
function renderBlockSafe(block) {
    if (!block.raw || block.raw.trim() === '') {
        return '<p class="block-empty-text">&nbsp;</p>';
    }
    const parsed = parseBlocks(block.raw);
    let html;
    if (parsed.length > 0) {
        html = parsed.map(renderBlock).join('\n');
    } else {
        html = renderBlock(block);
    }
    return DOMPurify.sanitize(html);
}

// textarea 자동 높이 조절
function autoResize(textarea) {
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

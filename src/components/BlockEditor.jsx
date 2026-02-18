import { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { parseBlocks, renderBlock } from '../utils/markdownParser';
import { validateImageFile, compressImage, uploadImageToServer } from '../utils/imageUpload';
import DOMPurify from 'dompurify';
import './BlockEditor.css';

let nextBlockId = 1;
function genBlockId() { return `blk-${nextBlockId++}`; }

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
            const ta = textareaRefs.current[activeIndex];
            ta.focus();
            if (pendingCursorPos.current !== null) {
                ta.selectionStart = pendingCursorPos.current;
                ta.selectionEnd = pendingCursorPos.current;
                pendingCursorPos.current = null;
            }
            autoResize(ta);
        }
    }, [activeIndex, blocks]);

    // blocks → raw markdown → onChange
    const emitChange = useCallback((newBlocks) => {
        isInternalChange.current = true;
        const raw = newBlocks.map(b => b.raw).join('\n\n');
        onChange(raw);
    }, [onChange]);

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

        // Backspace: 빈 블록 삭제
        if (e.key === 'Backspace' && raw === '' && blocks.length > 1) {
            e.preventDefault();
            setBlocks(prev => {
                const newBlocks = prev.filter((_, i) => i !== index);
                const newActive = Math.max(0, index - 1);
                setActiveIndex(newActive);
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
            {blocks.map((block, index) => (
                <div key={block.id || index} className={`block-wrapper ${activeIndex === index ? 'active' : ''}`}>
                    {activeIndex === index ? (
                        <textarea
                            ref={el => { textareaRefs.current[index] = el; }}
                            className="block-textarea"
                            value={block.raw}
                            onChange={(e) => handleInput(e, index)}
                            onKeyDown={(e) => handleKeyDown(e, index)}
                            onBlur={(e) => {
                                // 에디터 내부 클릭이면 blur 무시 (다른 블록/빈 영역 클릭 시)
                                if (containerRef.current && containerRef.current.contains(e.relatedTarget)) {
                                    return;
                                }
                                // 에디터 외부 클릭 시 비활성화
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
            ))}
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

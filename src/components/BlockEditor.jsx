import { useState, useRef, useEffect, useCallback } from 'react';
import { parseBlocks, renderBlock } from '../utils/markdownParser';
import './BlockEditor.css';

export default function BlockEditor({ content, onChange, onImageInsert }) {
    const [blocks, setBlocks] = useState(() => initBlocks(content));
    const [activeIndex, setActiveIndex] = useState(null);
    const textareaRefs = useRef({});
    const containerRef = useRef(null);
    const isInternalChange = useRef(false);

    // 외부 content 변경 시 blocks 동기화 (외부에서만)
    useEffect(() => {
        if (isInternalChange.current) {
            isInternalChange.current = false;
            return;
        }
        setBlocks(initBlocks(content));
    }, [content]);

    // 활성 블록에 포커스
    useEffect(() => {
        if (activeIndex !== null && textareaRefs.current[activeIndex]) {
            const ta = textareaRefs.current[activeIndex];
            ta.focus();
            autoResize(ta);
        }
    }, [activeIndex]);

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

    // 블록 클릭 → 활성화
    const handleBlockClick = (index) => {
        setActiveIndex(index);
    };

    // 빈 영역 클릭 → 새 블록 추가
    const handleEmptyClick = () => {
        setBlocks(prev => {
            const newBlocks = [...prev, { raw: '', type: 'paragraph' }];
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

        if (e.key === 'Enter' && !e.shiftKey && !isCodeBlock) {
            e.preventDefault();
            // 현재 블록 완료, 새 블록 생성
            setBlocks(prev => {
                const newBlocks = [...prev];
                // 현재 블록을 파싱하여 타입 업데이트
                const parsed = parseBlocks(raw);
                if (parsed.length > 0) {
                    newBlocks[index] = { ...parsed[0], raw };
                }
                // 새 빈 블록 삽입
                newBlocks.splice(index + 1, 0, { raw: '', type: 'paragraph' });
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

    // 이미지 삽입 콜백 (EditorPage에서 호출)
    useEffect(() => {
        if (!onImageInsert) return;
        // onImageInsert prop을 통해 이미지 핸들러 등록
    }, [onImageInsert]);

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

    return (
        <div className="block-editor" ref={containerRef}>
            {blocks.map((block, index) => (
                <div key={index} className={`block-wrapper ${activeIndex === index ? 'active' : ''}`}>
                    {activeIndex === index ? (
                        <textarea
                            ref={el => { textareaRefs.current[index] = el; }}
                            className="block-textarea"
                            value={block.raw}
                            onChange={(e) => handleInput(e, index)}
                            onKeyDown={(e) => handleKeyDown(e, index)}
                            onBlur={() => {
                                // 약간의 지연으로 다른 블록 클릭 시 깜빡임 방지
                                setTimeout(() => {
                                    setActiveIndex(prev => prev === index ? null : prev);
                                }, 150);
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
}

// 초기 블록 생성
function initBlocks(content) {
    if (!content || content.trim() === '') {
        return [{ raw: '', type: 'paragraph' }];
    }
    const parsed = parseBlocks(content);
    if (parsed.length === 0) {
        return [{ raw: '', type: 'paragraph' }];
    }
    return parsed;
}

// 안전한 블록 렌더링 (빈 블록 처리)
function renderBlockSafe(block) {
    if (!block.raw || block.raw.trim() === '') {
        return '<p class="block-empty-text">&nbsp;</p>';
    }
    // raw를 다시 파싱하여 최신 타입으로 렌더링
    const parsed = parseBlocks(block.raw);
    if (parsed.length > 0) {
        return parsed.map(renderBlock).join('\n');
    }
    return renderBlock(block);
}

// textarea 자동 높이 조절
function autoResize(textarea) {
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

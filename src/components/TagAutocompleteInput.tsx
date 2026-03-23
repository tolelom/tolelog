import { useState, useEffect, useRef, useCallback, ChangeEvent } from 'react';
import { TAG_API } from '../utils/api';
import { TagInfo } from '../types';

interface TagAutocompleteInputProps {
    value: string;
    onChange: (value: string) => void;
}

export default function TagAutocompleteInput({ value, onChange }: TagAutocompleteInputProps) {
    const [allTags, setAllTags] = useState<TagInfo[]>([]);
    const [tagSuggestions, setTagSuggestions] = useState<TagInfo[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const dropdownRef = useRef<HTMLDivElement | null>(null);

    // 태그 목록 로드
    useEffect(() => {
        const controller = new AbortController();
        TAG_API.getTags({ signal: controller.signal })
            .then(res => { if (res.status === 'success') setAllTags(res.data || []); })
            .catch(() => {});
        return () => controller.abort();
    }, []);

    const getCurrentTagInput = useCallback((): string => {
        const parts = value.split(',');
        return (parts[parts.length - 1] || '').trim();
    }, [value]);

    const filterSuggestions = useCallback((input: string) => {
        if (!input) {
            setTagSuggestions([]);
            setShowDropdown(false);
            return;
        }
        const existingTags = value.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
        const filtered = allTags
            .filter(t => t.name.toLowerCase().includes(input.toLowerCase()) && !existingTags.includes(t.name.toLowerCase()))
            .slice(0, 8);
        setTagSuggestions(filtered);
        setShowDropdown(filtered.length > 0);
        setActiveIndex(-1);
    }, [allTags, value]);

    const handleSelect = useCallback((tagName: string) => {
        const parts = value.split(',').map(t => t.trim()).filter(Boolean);
        parts.pop();
        parts.push(tagName);
        onChange(parts.join(', ') + ', ');
        setShowDropdown(false);
        setActiveIndex(-1);
        inputRef.current?.focus();
    }, [value, onChange]);

    const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
        const parts = e.target.value.split(',');
        const currentInput = (parts[parts.length - 1] || '').trim();
        filterSuggestions(currentInput);
    }, [onChange, filterSuggestions]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showDropdown || tagSuggestions.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => (prev + 1) % tagSuggestions.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => (prev <= 0 ? tagSuggestions.length - 1 : prev - 1));
        } else if (e.key === 'Enter' && activeIndex >= 0) {
            e.preventDefault();
            handleSelect(tagSuggestions[activeIndex].name);
        } else if (e.key === 'Escape') {
            setShowDropdown(false);
        }
    }, [showDropdown, tagSuggestions, activeIndex, handleSelect]);

    // Close dropdown on outside click
    useEffect(() => {
        if (!showDropdown) return;
        const handleClick = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
                inputRef.current && !inputRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [showDropdown]);

    return (
        <div className="tags-section">
            <div className="tags-input-wrapper">
                <input
                    ref={inputRef}
                    type="text"
                    name="tags"
                    value={value}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => { const cur = getCurrentTagInput(); if (cur) filterSuggestions(cur); }}
                    placeholder="태그를 쉼표로 구분하여 입력 (예: React, JavaScript, 블로그)"
                    className="tags-input"
                    autoComplete="off"
                />
                {showDropdown && tagSuggestions.length > 0 && (
                    <div className="tags-autocomplete" ref={dropdownRef}>
                        {tagSuggestions.map((t, i) => (
                            <button
                                key={t.name}
                                type="button"
                                className={`tags-autocomplete-item${i === activeIndex ? ' tags-autocomplete-item-active' : ''}`}
                                onMouseDown={(e) => { e.preventDefault(); handleSelect(t.name); }}
                            >
                                <span className="tags-autocomplete-name">{t.name}</span>
                                <span className="tags-autocomplete-count">{t.count}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
            {value && (
                <div className="tags-preview">
                    {value.split(',').map((tag: string, i: number) => {
                        const trimmed = tag.trim();
                        return trimmed ? <span key={i} className="tag-chip">{trimmed}</span> : null;
                    })}
                </div>
            )}
        </div>
    );
}

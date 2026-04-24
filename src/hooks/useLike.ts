import { useState, useEffect } from 'react';
import { LIKE_API } from '../utils/api';
import { notify } from '../utils/notify';

export function useLike(postId: string | undefined, token: string | null, initialLikeCount: number) {
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(initialLikeCount);
    const [likeLoading, setLikeLoading] = useState(false);

    useEffect(() => {
        setLikeCount(initialLikeCount);
    }, [initialLikeCount]);

    useEffect(() => {
        if (!postId || !token) return;
        const controller = new AbortController();
        LIKE_API.getStatus(postId, { signal: controller.signal, token })
            .then(res => { if (res.data) setLiked(res.data.liked); })
            .catch(() => {});
        return () => controller.abort();
    }, [postId, token]);

    const handleLike = async () => {
        if (!token || !postId || likeLoading) return;
        setLikeLoading(true);
        try {
            const res = await LIKE_API.toggle(postId, token);
            if (res.data) {
                setLiked(res.data.liked);
                setLikeCount(res.data.like_count);
            }
        } catch {
            notify.error('좋아요 처리에 실패했습니다');
        }
        finally { setLikeLoading(false); }
    };

    return { liked, likeCount, likeLoading, handleLike };
}

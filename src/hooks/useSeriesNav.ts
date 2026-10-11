import { useState, useEffect } from 'react';
import { SERIES_API } from '../utils/api';
import { SeriesNav, SeriesDetail } from '../types';

export function useSeriesNav(postId: string | undefined, token?: string) {
    const [seriesNav, setSeriesNav] = useState<SeriesNav | null>(null);
    const [seriesTocOpen, setSeriesTocOpen] = useState(false);
    const [seriesDetail, setSeriesDetail] = useState<SeriesDetail | null>(null);

    useEffect(() => {
        if (!postId) return;
        const controller = new AbortController();
        SERIES_API.getSeriesNav(postId, { signal: controller.signal, token })
            .then(res => { if (res.data) setSeriesNav(res.data); else setSeriesNav(null); })
            .catch((err) => console.warn('series-nav: failed to load:', err));
        return () => controller.abort();
    }, [postId, token]);

    const toggleSeriesToc = () => {
        const next = !seriesTocOpen;
        setSeriesTocOpen(next);
        if (next && !seriesDetail && seriesNav) {
            SERIES_API.getSeries(seriesNav.series_id, { token })
                .then(res => { if (res.data) setSeriesDetail(res.data); })
                .catch((err) => console.warn('series-nav: failed to load detail:', err));
        }
    };

    return { seriesNav, seriesTocOpen, seriesDetail, toggleSeriesToc };
}

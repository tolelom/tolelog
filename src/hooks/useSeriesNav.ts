import { useState, useEffect } from 'react';
import { SERIES_API } from '../utils/api';
import { SeriesNav, SeriesDetail } from '../types';

export function useSeriesNav(postId: string | undefined) {
    const [seriesNav, setSeriesNav] = useState<SeriesNav | null>(null);
    const [seriesTocOpen, setSeriesTocOpen] = useState(false);
    const [seriesDetail, setSeriesDetail] = useState<SeriesDetail | null>(null);

    useEffect(() => {
        if (!postId) return;
        const controller = new AbortController();
        SERIES_API.getSeriesNav(postId, { signal: controller.signal })
            .then(res => { if (res.data) setSeriesNav(res.data); else setSeriesNav(null); })
            .catch(() => {});
        return () => controller.abort();
    }, [postId]);

    const toggleSeriesToc = () => {
        const next = !seriesTocOpen;
        setSeriesTocOpen(next);
        if (next && !seriesDetail && seriesNav) {
            SERIES_API.getSeries(seriesNav.series_id)
                .then(res => { if (res.data) setSeriesDetail(res.data); })
                .catch(() => {});
        }
    };

    return { seriesNav, seriesTocOpen, seriesDetail, toggleSeriesToc };
}

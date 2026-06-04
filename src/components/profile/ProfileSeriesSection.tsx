import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { SERIES_API } from '../../utils/api';
import SeriesFormModal from '../SeriesFormModal';
import { notify as toast } from '../../utils/notify';
import { Series } from '../../types';

interface ProfileSeriesSectionProps {
    /** 표시할 시리즈 목록 (소유는 부모 — 프로필 통계 표시에 공유됨) */
    seriesList: Series[];
    /** 본인 프로필 여부 — true일 때만 생성/수정/삭제 UI 노출 */
    isOwner: boolean;
    token: string | null;
    userId: string;
    /** CRUD 성공 후 부모 목록 동기화 */
    onSeriesChange: (next: Series[]) => void;
}

export default function ProfileSeriesSection({
    seriesList,
    isOwner,
    token,
    userId,
    onSeriesChange,
}: ProfileSeriesSectionProps) {
    const [seriesModalOpen, setSeriesModalOpen] = useState(false);
    const [editingSeries, setEditingSeries] = useState<Series | null>(null);
    const [deletingSeriesId, setDeletingSeriesId] = useState<number | null>(null);
    const [seriesError, setSeriesError] = useState('');

    const refreshSeriesList = useCallback(async () => {
        if (!userId) return;
        try {
            const res = await SERIES_API.getUserSeries(userId);
            if (res.status === 'success') onSeriesChange(res.data || []);
        } catch { /* ignore */ }
    }, [userId, onSeriesChange]);

    const handleCreateSeries = async (title: string, description: string) => {
        if (!token) return;
        await SERIES_API.createSeries(title, description, token);
        setSeriesModalOpen(false);
        toast.success('시리즈를 만들었습니다.');
        await refreshSeriesList();
    };

    const handleUpdateSeries = async (title: string, description: string) => {
        if (!token || !editingSeries) return;
        await SERIES_API.updateSeries(editingSeries.id, title, description, token);
        setEditingSeries(null);
        toast.success('시리즈를 수정했습니다.');
        await refreshSeriesList();
    };

    const handleDeleteSeries = async (seriesId: number) => {
        if (!token) return;
        setSeriesError('');
        try {
            await SERIES_API.deleteSeries(seriesId, token);
            setDeletingSeriesId(null);
            toast.success('시리즈를 삭제했습니다.');
            await refreshSeriesList();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : '시리즈 삭제에 실패했습니다.';
            setSeriesError(msg);
            toast.error(msg);
            setDeletingSeriesId(null);
        }
    };

    return (
        <>
            <div className="profile-series-section">
                {isOwner && (
                    <div className="profile-series-header">
                        <button
                            className="btn btn-primary profile-series-create-btn"
                            onClick={() => setSeriesModalOpen(true)}
                        >
                            + 새 시리즈
                        </button>
                    </div>
                )}

                {seriesError && (
                    <p className="profile-series-error">{seriesError}</p>
                )}

                {seriesList.length === 0 ? (
                    <div className="profile-status">
                        <p>아직 시리즈가 없습니다.</p>
                    </div>
                ) : (
                    seriesList.map((s: Series) => (
                        <div key={s.id} className="profile-series-card">
                            <Link to={`/series/${s.id}`} className="profile-series-card-link">
                                <h3 className="profile-series-title">{s.title}</h3>
                                {s.description && (
                                    <p className="profile-series-desc">{s.description}</p>
                                )}
                                <span className="profile-series-count">{s.post_count}개의 글</span>
                            </Link>
                            {isOwner && (
                                <div className="profile-series-card-actions">
                                    {deletingSeriesId === s.id ? (
                                        <div className="profile-series-delete-confirm">
                                            <span>삭제하시겠습니까?</span>
                                            <button className="profile-series-confirm-yes" onClick={() => handleDeleteSeries(s.id)}>확인</button>
                                            <button className="profile-series-confirm-no" onClick={() => setDeletingSeriesId(null)}>취소</button>
                                        </div>
                                    ) : (
                                        <>
                                            <button
                                                className="profile-series-edit-btn"
                                                onClick={() => setEditingSeries(s)}
                                            >
                                                편집
                                            </button>
                                            <button
                                                className="profile-series-delete-btn"
                                                onClick={() => setDeletingSeriesId(s.id)}
                                            >
                                                삭제
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* 시리즈 생성/수정 모달 */}
            {seriesModalOpen && (
                <SeriesFormModal
                    onSubmit={handleCreateSeries}
                    onClose={() => setSeriesModalOpen(false)}
                />
            )}
            {editingSeries && (
                <SeriesFormModal
                    series={editingSeries}
                    onSubmit={handleUpdateSeries}
                    onClose={() => setEditingSeries(null)}
                />
            )}
        </>
    );
}

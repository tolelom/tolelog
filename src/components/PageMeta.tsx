// vite-react-ssg 의 Head 는 react-helmet-async 를 감싸면서 SSR 시 <head> 로 정확히 주입한다.
import { Head as Helmet } from 'vite-react-ssg';
import { useLocation } from 'react-router-dom';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '../utils/constants';

type OgType = 'website' | 'article' | 'profile';

interface PageMetaProps {
    /** 페이지별 제목. 비우면 사이트 이름만 사용. 채우면 `{title} | {SITE_NAME}` 형식. */
    title?: string;
    /** description. 비우면 사이트 기본 사용. */
    description?: string;
    /** canonical 경로(절대 또는 상대). 비우면 현재 location pathname 사용. */
    canonical?: string;
    /** og:image 절대 URL. */
    ogImage?: string;
    /** og:type — 게시글은 `article`, 그 외는 `website` 또는 `profile`. */
    ogType?: OgType;
    /** true 면 robots noindex,nofollow. 비공개/임시 페이지에 사용. */
    noindex?: boolean;
    /** 기본 `ko_KR`. */
    locale?: string;
    /** og:type=article 일 때 추가 정보. */
    article?: {
        publishedTime?: string;
        modifiedTime?: string;
        author?: string;
        tags?: string[];
    };
}

function absoluteUrl(pathOrUrl: string): string {
    if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
    const normalizedPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
    return `${SITE_URL}${normalizedPath}`;
}

export default function PageMeta({
    title,
    description = SITE_DESCRIPTION,
    canonical,
    ogImage,
    ogType = 'website',
    noindex = false,
    locale = 'ko_KR',
    article,
}: PageMetaProps) {
    const { pathname } = useLocation();
    const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
    const canonicalUrl = absoluteUrl(canonical ?? pathname);

    return (
        <Helmet>
            <title>{fullTitle}</title>
            <meta name="description" content={description} />
            <link rel="canonical" href={canonicalUrl} />

            {noindex && <meta name="robots" content="noindex,nofollow" />}

            <meta property="og:site_name" content={SITE_NAME} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:type" content={ogType} />
            <meta property="og:url" content={canonicalUrl} />
            <meta property="og:locale" content={locale} />
            {ogImage && <meta property="og:image" content={absoluteUrl(ogImage)} />}

            <meta name="twitter:card" content={ogImage ? 'summary_large_image' : 'summary'} />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={description} />
            {ogImage && <meta name="twitter:image" content={absoluteUrl(ogImage)} />}

            {ogType === 'article' && article?.publishedTime && (
                <meta property="article:published_time" content={article.publishedTime} />
            )}
            {ogType === 'article' && article?.modifiedTime && (
                <meta property="article:modified_time" content={article.modifiedTime} />
            )}
            {ogType === 'article' && article?.author && (
                <meta property="article:author" content={article.author} />
            )}
            {ogType === 'article' && article?.tags?.map((tag) => (
                <meta key={tag} property="article:tag" content={tag} />
            ))}
        </Helmet>
    );
}

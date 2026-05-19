// SSR 시 <head> 로 정확히 주입되도록 vite-react-ssg 의 Head 사용 (내부적으로 react-helmet-async)
import { Head as Helmet } from 'vite-react-ssg';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '../utils/constants';

function absoluteUrl(pathOrUrl: string): string {
    if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
    const normalizedPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
    return `${SITE_URL}${normalizedPath}`;
}

function jsonLd(data: object): string {
    // 스크립트 종료 태그가 본문에 끼어드는 XSS 회피
    return JSON.stringify(data).replace(/</g, '\\u003c');
}

// ─── BlogPosting (게시글) ───

interface ArticleJsonLdProps {
    url: string;            // 게시글의 canonical URL (절대 또는 상대)
    title: string;
    description: string;
    authorName: string;
    datePublished: string;  // ISO 8601
    dateModified?: string;  // ISO 8601
    image?: string;         // 절대 URL 권장
    tags?: string[];
}

export function ArticleJsonLd({
    url,
    title,
    description,
    authorName,
    datePublished,
    dateModified,
    image,
    tags,
}: ArticleJsonLdProps) {
    const data = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: title,
        description,
        url: absoluteUrl(url),
        mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl(url) },
        author: { '@type': 'Person', name: authorName },
        publisher: {
            '@type': 'Organization',
            name: SITE_NAME,
            url: SITE_URL,
        },
        datePublished,
        dateModified: dateModified ?? datePublished,
        ...(image ? { image: absoluteUrl(image) } : {}),
        ...(tags && tags.length > 0 ? { keywords: tags.join(', ') } : {}),
    };

    return (
        <Helmet>
            <script type="application/ld+json">{jsonLd(data)}</script>
        </Helmet>
    );
}

// ─── Blog (사이트 홈/리스트) ───

interface BlogJsonLdProps {
    /** 기본 사이트 설명을 덮어쓸 때만 사용. */
    description?: string;
}

export function BlogJsonLd({ description = SITE_DESCRIPTION }: BlogJsonLdProps = {}) {
    const data = {
        '@context': 'https://schema.org',
        '@type': 'Blog',
        name: SITE_NAME,
        description,
        url: SITE_URL,
        publisher: {
            '@type': 'Organization',
            name: SITE_NAME,
            url: SITE_URL,
        },
    };

    return (
        <Helmet>
            <script type="application/ld+json">{jsonLd(data)}</script>
        </Helmet>
    );
}

// ─── BreadcrumbList ───

export interface BreadcrumbItem {
    name: string;
    /** 절대 또는 상대 경로. 마지막 항목(현재 페이지)도 URL을 넣는다. */
    url: string;
}

interface BreadcrumbJsonLdProps {
    items: BreadcrumbItem[];
}

export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
    if (items.length === 0) return null;

    const data = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, idx) => ({
            '@type': 'ListItem',
            position: idx + 1,
            name: item.name,
            item: absoluteUrl(item.url),
        })),
    };

    return (
        <Helmet>
            <script type="application/ld+json">{jsonLd(data)}</script>
        </Helmet>
    );
}

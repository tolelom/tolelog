# M6 큰 파일 리팩토링 — Design Spec

**Date**: 2026-06-04
**Status**: ✅ 사용자 승인 완료
**Scope**: tolelog 프론트엔드 3개 파일 + fiber_api_server(tolelog-backend) 1개 파일
**Origin**: 종합 진단 리포트(2026-05-19) M6 항목

## 목표

400~525줄대 파일 4개를 책임 단위로 분리해 가독성·유지보수성을 높인다.
**동작 변경 0** — 순수 이동/추출만 허용, 로직 수정 금지.

## 결정 사항

| Topic | Decision | Reason |
|---|---|---|
| 스코프 | markdownParser / api.ts / post~service.go / UserProfilePage 4개 | 사용자 선택. BlockEditor(512줄)는 ref 구조 얽힘으로 리스크 高 → 제외 |
| import 호환 | **배럴 re-export 유지** | 기존 import 30여 곳 무변경, diff 최소 |
| 커밋 단위 | 유닛당 1커밋, 매 유닛 후 전체 테스트 | 회귀 시 bisect 용이 |
| CSS | 클래스명/파일 무변경 | 동작 변경 0 원칙 |

## 유닛 1: `utils/api.ts` (400줄) → `utils/api/` + 배럴

```
utils/api/client.ts    — authenticatedFetch, 토큰 리프레시, 공통 에러 처리
utils/api/posts.ts     — POST_API
utils/api/auth.ts      — AUTH_API, USER_API
utils/api/comments.ts  — COMMENT_API
utils/api/series.ts    — SERIES_API
utils/api/misc.ts      — IMAGE_API, TAG_API, LIKE_API
utils/api.ts           — 배럴 re-export (공개 표면 무변경)
```

검증: `api.test.ts`(배럴 경유 그대로 동작해야 함), type-check, 전체 테스트.

## 유닛 2: `utils/markdownParser.ts` (525줄) → `utils/markdown/` + 배럴

기존 코드의 자연 경계를 따라 분리:

```
utils/markdown/katex.ts   — KaTeX 지연 로딩/구독 (subscribeKatexReady, isKatexReady, hasMath, loadKatex, renderKatex)
utils/markdown/text.ts    — escapeHtml, slugifyHeading (공유 헬퍼)
utils/markdown/inline.ts  — parseInline, parseInlineWithRefs
utils/markdown/blocks.ts  — parseBlocks, parseTableRow, parseTableAlignments, parseList
utils/markdown/render.ts  — renderBlock(WithRefs), renderMarkdown(WithRefs), sanitize
utils/markdownParser.ts   — 배럴 (기존 공개 export 전부 유지)
```

의존 방향: render → inline·blocks·text, inline → katex·text. 순환 금지.
검증: `markdownParser.test.ts` 통과, type-check.

## 유닛 3: `post/service.go` (431줄) → 동일 패키지 4파일 — **fiber_api_server 레포**

Go 동일 패키지 내 파일 분리 (호출부 영향 0):

```
service.go        — Service 인터페이스, NewService, CreatePost/GetPostByID/UpdatePost/DeletePost
service_query.go  — GetPublicPosts/GetUserPosts/SearchPosts/GetDrafts, SanitizeSearchQuery/SanitizeTag, escapeLike
service_like.go   — ToggleLike/IsLiked
service_cache.go  — 캐시 키 상수·TTL, invalidatePostCaches, cachedPublicPostList
```

검증: `service_db_test.go` 24개 테스트(2026-06-04 작성)가 안전망. go build/test/vet.
syncTags/splitTags는 CreatePost·UpdatePost가 사용하므로 service.go 잔류.

## 유닛 4: `UserProfilePage.tsx` (470줄) → 섹션 컴포넌트 추출

```
components/profile/ProfileSeriesSection.tsx — 시리즈 탭: 목록 렌더, SeriesFormModal 연동,
                                               CRUD 핸들러, 관련 상태(seriesModalOpen/editingSeries/
                                               deletingSeriesId/seriesError)
components/profile/ProfilePostList.tsx      — 글 탭: 포스트 카드 목록, 태그 필터 표시
pages/UserProfilePage.tsx                    — 프로필 헤더, 아바타 업로드(소형이라 잔류),
                                               탭 전환, 데이터 페칭 (~250줄 목표)
```

Props 경계: seriesList와 setSeriesList(또는 변경 콜백)는 부모가 소유 — 시리즈 수(통계 표시)를 부모도 쓰기 때문.
ProfileSeriesSection은 `series: Series[]`, `isOwner: boolean`, `token`, `onSeriesChange` 콜백을 받는다.
ProfilePostList는 `posts`, `currentUserId`, 태그 필터 상태를 받는 표시 전용 컴포넌트.

검증: type-check + lint + 전체 테스트 + 프로덕션 빌드(SSG).

## Non-goals

- BlockEditor.tsx / EditorPage.tsx 분리 (이번 스코프 외)
- 로직 개선·버그 수정·성능 최적화 (동작 변경 0 원칙)
- import 경로 전면 수정 (배럴로 차단)
- 새 테스트 작성 (기존 테스트가 회귀 안전망 — 단, 추출된 컴포넌트가 기존 테스트로 커버 안 되는 건 허용)

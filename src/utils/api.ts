// 도메인별 API 모듈의 배럴 re-export.
// 기존 import 경로('utils/api') 호환을 위해 유지한다. 구현은 ./api/ 하위 참조.
export { POST_API } from './api/posts';
export { AUTH_API, USER_API } from './api/auth';
export { COMMENT_API } from './api/comments';
export { SERIES_API } from './api/series';
export { IMAGE_API, LIKE_API, TAG_API } from './api/misc';

// Prefix a site-root path with the configured base path, so the same build
// works at a domain root (atspl.com.au/) and under a sub-path
// (username.github.io/repo/).
const base = import.meta.env.BASE_URL.replace(/\/$/, '');

export const url = (path: string) => (path.startsWith('/') ? base + path : path);
export const isPreviewBase = base !== '';

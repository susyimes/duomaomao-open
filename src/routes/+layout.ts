// The WebGL preview is client rendered, including fallback/error routes.
// This also avoids the upstream Kit preview's SSR error-node regression.
export const ssr = false;

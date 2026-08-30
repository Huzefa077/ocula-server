// This file safely fetches external images through the backend when the frontend cannot load them directly.
const DISALLOWED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  'metadata.google.internal'
]);
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 3;

function isPrivateIpv4(hostname) {
  return (
    /^10\./.test(hostname) ||
    /^127\./.test(hostname) ||
    /^169\.254\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}

// Blocks local and private addresses so the proxy cannot be abused.
function isBlockedHostname(hostname) {
  const normalizedHost = hostname.toLowerCase();

  return (
    DISALLOWED_HOSTS.has(normalizedHost) ||
    normalizedHost.endsWith('.local') ||
    isPrivateIpv4(normalizedHost)
  );
}

function validateImageUrl(rawUrl) {
  const parsedUrl = new URL(rawUrl);

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('Only HTTP and HTTPS image URLs are allowed');
  }

  if (isBlockedHostname(parsedUrl.hostname)) {
    throw new Error('That image host is not allowed');
  }

  return parsedUrl;
}

async function fetchWithSafeRedirects(startUrl, requestOptions, redirectsLeft = MAX_REDIRECTS) {
  const response = await fetch(startUrl.toString(), {
    ...requestOptions,
    redirect: 'manual'
  });

  if (![301, 302, 303, 307, 308].includes(response.status)) {
    return response;
  }

  if (redirectsLeft <= 0) {
    throw new Error('Too many image redirects');
  }

  const location = response.headers.get('location');

  if (!location) {
    throw new Error('Image redirect is missing a location');
  }

  // Every redirect target is validated again so an allowed URL cannot bounce
  // the backend into a private/internal network address.
  const nextUrl = validateImageUrl(new URL(location, startUrl).toString());
  return fetchWithSafeRedirects(nextUrl, requestOptions, redirectsLeft - 1);
}

async function readImageBodyWithLimit(response) {
  const contentLength = Number(response.headers.get('content-length') || 0);

  if (contentLength > MAX_IMAGE_BYTES) {
    throw new Error('Image is larger than 5MB');
  }

  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    totalBytes += value.length;

    if (totalBytes > MAX_IMAGE_BYTES) {
      throw new Error('Image is larger than 5MB');
    }

    chunks.push(Buffer.from(value));
  }

  return Buffer.concat(chunks);
}

// Fetches a remote image through the backend when direct loading is not possible.
const handleImageProxy = async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json('Image URL is required');
  }

  let parsedUrl;

  try {
    parsedUrl = validateImageUrl(url);
  } catch (error) {
    return res.status(400).json(error.message || 'Invalid image URL');
  }

  // Timeout keeps one slow image request from hanging the server too long.
  // AbortController is the cancel handle. Calling .abort() stops the in-flight fetch if it takes too long.
  const imageRequestController = new AbortController();
  const imageRequestTimeoutId = setTimeout(() => imageRequestController.abort(), 10000);

  try {
    const upstreamResponse = await fetchWithSafeRedirects(parsedUrl, {
      signal: imageRequestController.signal,
      headers: {
        Accept: 'image/*,*/*;q=0.8',
        'User-Agent': 'Ocula Image Proxy'
      }
    });

    if (!upstreamResponse.ok) {
      return res.status(502).json(`Failed to fetch image: ${upstreamResponse.status}`);
    }

    const contentType = upstreamResponse.headers.get('content-type') || '';
    const mimeType = contentType.split(';')[0].trim().toLowerCase();

    if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
      return res.status(415).json('Only JPEG, PNG, and WebP images are supported');
    }

    const imageBuffer = await readImageBodyWithLimit(upstreamResponse);

    res.set('Content-Type', mimeType);
    res.set('Cache-Control', 'public, max-age=600');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');

    return res.send(imageBuffer);
  } catch (error) {
    const message = error.name === 'AbortError'
      ? 'Image request timed out'
      : error.message || 'Unable to fetch image';

    return res.status(502).json(message);
  } finally {
    clearTimeout(imageRequestTimeoutId);
  }
};

module.exports = {
  handleImageProxy
};

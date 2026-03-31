const DISALLOWED_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

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

// Fetches a remote image through the backend when direct loading is not possible.
const handleImageProxy = async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json('Image URL is required');
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(url);
  } catch (error) {
    return res.status(400).json('Invalid image URL');
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return res.status(400).json('Only HTTP and HTTPS image URLs are allowed');
  }

  if (isBlockedHostname(parsedUrl.hostname)) {
    return res.status(400).json('That image host is not allowed');
  }

  // Timeout keeps one slow image request from hanging the server too long.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const upstreamResponse = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      headers: {
        Accept: 'image/*,*/*;q=0.8',
        'User-Agent': 'Ocula Image Proxy'
      }
    });

    if (!upstreamResponse.ok) {
      return res.status(502).json(`Failed to fetch image: ${upstreamResponse.status}`);
    }

    const contentType = upstreamResponse.headers.get('content-type') || '';

    if (!contentType.startsWith('image/')) {
      return res.status(415).json('URL did not return an image');
    }

    const imageBuffer = Buffer.from(await upstreamResponse.arrayBuffer());

    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=600');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');

    return res.send(imageBuffer);
  } catch (error) {
    const message = error.name === 'AbortError'
      ? 'Image request timed out'
      : 'Unable to fetch image';

    return res.status(502).json(message);
  } finally {
    clearTimeout(timeout);
  }
};

module.exports = {
  handleImageProxy
};

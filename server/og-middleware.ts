import { storage } from "./storage";
import fs from "fs";
import path from "path";

const CRAWLER_USER_AGENTS = [
  'facebookexternalhit',
  'WhatsApp',
  'Twitterbot',
  'LinkedInBot',
  'Slackbot',
  'TelegramBot',
  'Discordbot',
  'instagram',
];

function isCrawler(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return CRAWLER_USER_AGENTS.some(crawler => ua.includes(crawler.toLowerCase()));
}

function generateOGHtml(options: {
  title: string;
  description: string;
  imageUrl: string;
  url: string;
  baseHtml?: string;
}): string {
  const { title, description, imageUrl, url, baseHtml } = options;
  
  const ogTags = `
    <!-- Open Graph / Facebook / WhatsApp -->
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="${url}" />
    <meta property="og:type" content="website" />
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${imageUrl}" />
  `;

  if (baseHtml) {
    const ogStartIndex = baseHtml.indexOf('<!-- Open Graph');
    const ogEndIndex = baseHtml.indexOf('<meta name="twitter:image"');
    
    if (ogStartIndex !== -1 && ogEndIndex !== -1) {
      const endTagClose = baseHtml.indexOf('>', ogEndIndex) + 1;
      const before = baseHtml.substring(0, ogStartIndex);
      const after = baseHtml.substring(endTagClose);
      return before + ogTags + after;
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
    <title>${escapeHtml(title)}</title>
    ${ogTags}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

export async function handleDynamicOGTags(
  req: any,
  res: any,
  next: any,
  baseHtml?: string
): Promise<boolean> {
  const userAgent = req.headers['user-agent'] || '';
  
  if (!isCrawler(userAgent)) {
    return false;
  }

  const urlPath = req.path || req.originalUrl;
  
  // Match multiple route patterns:
  // 1. /register/:groupLink
  // 2. /join/:groupLink
  // 3. /:groupLink (short URL pattern, but exclude reserved routes)
  const registerMatch = urlPath.match(/^\/register\/([^\/]+)/);
  const joinMatch = urlPath.match(/^\/join\/([^\/]+)/);
  const shortMatch = urlPath.match(/^\/([^\/]+)$/);
  
  let groupLink: string | null = null;
  
  if (registerMatch) {
    groupLink = registerMatch[1];
  } else if (joinMatch) {
    groupLink = joinMatch[1];
  } else if (shortMatch) {
    // Exclude reserved routes like /api, /assets, etc.
    const reservedRoutes = ['api', 'assets', 'login', 'register', 'join', 'admin', 'dashboard'];
    const potentialLink = shortMatch[1];
    
    if (!reservedRoutes.includes(potentialLink.toLowerCase())) {
      groupLink = potentialLink;
    }
  }
  
  if (!groupLink) {
    return false;
  }
  
  try {
    // Try custom slug first, then fall back to registration link
    let group = await storage.getGroupByCustomSlug(groupLink);
    
    if (!group) {
      group = await storage.getGroupByRegistrationLink(groupLink);
    }
    
    if (!group) {
      return false;
    }

    const host = req.get('host');
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;
    const pageUrl = `${baseUrl}${urlPath}`;
    const imageUrl = `${baseUrl}/og-image.jpg`;
    
    const title = `Join ${group.name} on Kontrib`;
    const description = group.description || 
      `Join ${group.name} for group financial contributions. Easily manage payments and track progress together.`;
    
    const html = generateOGHtml({
      title,
      description,
      imageUrl,
      url: pageUrl,
      baseHtml
    });

    res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
    return true;
  } catch (error) {
    console.error('Error generating dynamic OG tags:', error);
    return false;
  }
}

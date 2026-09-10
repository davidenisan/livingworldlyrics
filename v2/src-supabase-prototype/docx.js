const trackPattern = /^\s*(\d{1,3})\s*[).:-]\s*(.+)$/;
const youtubePattern = /https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be|music\.youtube\.com)\/[^\s<>'"]+/i;
const sectionPattern = /^(verse|chorus|bridge|refrain|tag|pre-chorus|intro|outro)\b/i;

export async function parseSongsFromDocx(file) {
  const { default: mammoth } = await import('mammoth');
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
  const document = new DOMParser().parseFromString(html, 'text/html');
  const nodes = [...document.body.children];
  const titleIndexes = nodes
    .map((node, index) => (/^H[12]$/.test(node.tagName) && node.textContent.trim() ? index : -1))
    .filter((index) => index >= 0);

  if (!titleIndexes.length) throw new Error('No song title headings found. Use Heading 1 or Heading 2 in the DOCX.');

  return titleIndexes.map((start, position) => {
    const end = titleIndexes[position + 1] ?? nodes.length;
    const rawTitle = nodes[start].textContent.trim();
    const match = rawTitle.match(trackPattern);
    const title = (match?.[2] || rawTitle).trim();
    let songwriters = null;
    let youtube_url = null;
    const lyrics = [];

    nodes.slice(start + 1, end).forEach((node) => {
      const text = node.textContent.trim();
      const link = [...node.querySelectorAll('a')].map((anchor) => anchor.href).find((href) => youtubePattern.test(href));
      const inlineYoutube = text.match(youtubePattern)?.[0];
      if (!youtube_url && (link || inlineYoutube)) youtube_url = link || inlineYoutube;
      if (!text) return;
      if (!songwriters && node.tagName === 'H3') {
        songwriters = text;
        return;
      }
      if (/^url\s*:/i.test(text) || text === youtube_url) return;
      if (sectionPattern.test(text) && node.tagName === 'P') lyrics.push(`<h2>${node.innerHTML}</h2>`);
      else lyrics.push(node.outerHTML);
    });

    return {
      title,
      track_number: match ? Number(match[1]) : null,
      songwriters,
      youtube_url,
      lyrics: lyrics.join('') || null,
    };
  }).filter((song) => song.title);
}

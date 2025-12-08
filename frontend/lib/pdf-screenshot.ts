const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Get a screenshot of a PDF page as base64
 * Uses the backend to render PDF pages
 */
export async function getPDFPageScreenshot(
  filename: string, 
  page: number
): Promise<string | null> {
  try {
    const response = await fetch(
      `${API_URL}/upload/pdf/${encodeURIComponent(filename)}/screenshot?page=${page}`
    );
    
    if (!response.ok) {
      console.warn('Could not get PDF screenshot');
      return null;
    }
    
    const data = await response.json();
    return data.image; // base64 string
  } catch (error) {
    console.error('PDF screenshot error:', error);
    return null;
  }
}

/**
 * Get screenshots of multiple PDF pages
 */
export async function getPDFPagesScreenshots(
  citations: Array<{ source: string; page: number }>
): Promise<Array<{ source: string; page: number; image: string }>> {
  const screenshots = await Promise.all(
    citations.slice(0, 3).map(async (citation) => {
      const image = await getPDFPageScreenshot(citation.source, citation.page);
      return {
        ...citation,
        image: image || ''
      };
    })
  );
  
  return screenshots.filter(s => s.image);
}
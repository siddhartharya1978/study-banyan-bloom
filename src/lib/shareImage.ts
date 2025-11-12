import { toPng } from 'html-to-image';

export interface SessionStats {
  accuracy: number;
  xpEarned: number;
  level: number;
  correct: number;
  incorrect: number;
}

export async function generateSessionImage(stats: SessionStats): Promise<void> {
  try {
    const element = document.getElementById('share-template');
    if (!element) {
      throw new Error('Share template not found');
    }
    
    // Wait for fonts and images to load
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const dataUrl = await toPng(element, { 
      quality: 1, 
      pixelRatio: 2,
      cacheBust: true,
    });
    
    // Download the image
    const link = document.createElement('a');
    link.download = `banyan-tree-session-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error('Error generating share image:', error);
    throw error;
  }
}

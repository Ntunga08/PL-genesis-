import api from './api';

// Cache to prevent repeated API calls
let faviconCache: string | null = null;
let titleCache: string | null = null;
let faviconFetching = false;
let titleFetching = false;

const createCircularFavicon = (imageUrl: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Create canvas
      const canvas = document.createElement('canvas');
      const size = 256;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve(imageUrl);
        return;
      }
      
      // Draw circular clipping path
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      
      // Draw image
      ctx.drawImage(img, 0, 0, size, size);
      
      // Add subtle border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
      ctx.stroke();
      
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(imageUrl);
    img.src = imageUrl;
  });
};

export const updateFavicon = async () => {
  // Return cached result if already fetched
  if (faviconCache) {

    return;
  }
  
  // Prevent multiple simultaneous fetches
  if (faviconFetching) {

    return;
  }
  
  faviconFetching = true;
  
  try {
    // Fetch logo from settings
    const response = await api.get('/settings/logo');
    
    if (response.data.logo_url) {
      // Create circular version of the logo
      const circularLogo = await createCircularFavicon(response.data.logo_url);
      
      // Update favicon
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = circularLogo;
      
      // Also update apple-touch-icon
      let appleLink = document.querySelector("link[rel~='apple-touch-icon']") as HTMLLinkElement;
      if (!appleLink) {
        appleLink = document.createElement('link');
        appleLink.rel = 'apple-touch-icon';
        document.head.appendChild(appleLink);
      }
      appleLink.href = circularLogo;
      
      // Cache the result
      faviconCache = circularLogo;
    }
  } catch (error) {

  } finally {
    faviconFetching = false;
  }
};

export const updatePageTitle = async () => {
  // Return cached result if already fetched
  if (titleCache) {

    return;
  }
  
  // Prevent multiple simultaneous fetches
  if (titleFetching) {

    return;
  }
  
  titleFetching = true;
  
  try {
    const response = await api.get('/settings');
    const settings = response.data.settings || [];
    
    const hospitalName = settings.find((s: any) => s.key === 'hospital_name')?.value;
    if (hospitalName) {
      document.title = `${hospitalName} - Hospital Management System`;
      titleCache = hospitalName;
    }
  } catch (error) {

  } finally {
    titleFetching = false;
  }
};

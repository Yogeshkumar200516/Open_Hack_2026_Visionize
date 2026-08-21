/**
 * imageUtils.js
 * Utilities for robust image handling in PDF generation.
 */

/**
 * "Bulletproof" Logo Engine: 
 * Ensures the logo is fully rendered by the browser's graphics engine before 
 * capturing it for the PDF. Crucial for complex SVGs with masks (like Mahisha).
 */
export const ensureCompatibleImage = async (dataUrl) => {
  if (!dataUrl) return null;

  return new Promise((resolve) => {
    // 1. Create a DOM-attached image (hidden) to force real rendering
    const img = document.createElement("img");
    img.style.position = "fixed";
    img.style.top = "-9999px";
    img.style.left = "-9999px";
    img.style.visibility = "hidden";
    img.crossOrigin = "Anonymous";
    
    // Safety timeout
    const timeout = setTimeout(() => {
      document.body.removeChild(img);
      console.warn("DEBUG: Robust logo conversion timed out.");
      resolve(null);
    }, 6000);

    img.onload = () => {
      // 2. Wait for two frames to ensure SVG masks/filters are painted
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          try {
            clearTimeout(timeout);
            
            const maxDim = 250; 
            let w = img.naturalWidth || img.width;
            let h = img.naturalHeight || img.height;
            
            // Handle cases where natural dimensions aren't reported instantly
            if (!w || !h) {
              w = 250; h = 250;
            }

            if (w > h && w > maxDim) {
              h = (h / w) * maxDim;
              w = maxDim;
            } else if (h > maxDim) {
              w = (w / h) * maxDim;
              h = maxDim;
            }

            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            
            // Fill white (ensures compatibility for all PDF viewers)
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, w, h);
            
            ctx.drawImage(img, 0, 0, w, h);
            
            // USE JPEG with compression for smaller PDF size
            const result = canvas.toDataURL("image/jpeg", 0.7);
            
            // Clean up DOM
            document.body.removeChild(img);
            resolve(result);
          } catch (err) {
            console.error("DEBUG: Failed in Bulletproof Logo Engine:", err);
            if (img.parentNode) document.body.removeChild(img);
            resolve(null);
          }
        });
      });
    };

    img.onerror = (e) => {
      clearTimeout(timeout);
      console.error("DEBUG: Logo load failed", e);
      if (img.parentNode) document.body.removeChild(img);
      resolve(null);
    };

    // Attach to DOM before setting source to ensure full rendering context
    document.body.appendChild(img);
    img.src = dataUrl;
  });
};

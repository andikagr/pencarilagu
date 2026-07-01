from PIL import Image
import numpy as np

def make_transparent_with_threshold(input_path, output_path):
    img = Image.open(input_path).convert('RGB')
    data = np.array(img, dtype=np.float32)
    
    r = data[:,:,0]
    g = data[:,:,1]
    b = data[:,:,2]
    
    # Calculate luminance/max
    alpha = np.maximum.reduce([r, g, b])
    
    # Apply a threshold to eliminate dark gray noise
    threshold = 30
    alpha = np.clip(alpha - threshold, 0, 255)
    # Rescale alpha to 0-255
    alpha = alpha * (255.0 / (255.0 - threshold))
    
    # Prevent division by zero
    alpha_safe = np.where(alpha == 0, 1, alpha)
    
    # Un-premultiply (boost color of translucent pixels)
    out_r = np.clip((r / alpha_safe) * 255, 0, 255)
    out_g = np.clip((g / alpha_safe) * 255, 0, 255)
    out_b = np.clip((b / alpha_safe) * 255, 0, 255)
    
    # If alpha is 0, make color 0 to be perfectly clean
    out_r[alpha == 0] = 0
    out_g[alpha == 0] = 0
    out_b[alpha == 0] = 0
    
    out_img = np.dstack((out_r, out_g, out_b, alpha))
    out_img = out_img.astype(np.uint8)
    
    Image.fromarray(out_img, 'RGBA').save(output_path)

# Use the ORIGINAL artifact to prevent double processing
import os
import glob
artifacts = glob.glob(r'C:\Users\USER\.gemini\antigravity\brain\d810ae6f-2429-47b5-9425-054f1a63dda4\media__*.png')
# Find the 47155 byte one, which is the original logo
original_img = None
for a in artifacts:
    if os.path.getsize(a) == 47155:
        original_img = a
        break

if original_img:
    print(f"Processing {original_img}")
    make_transparent_with_threshold(original_img, 'public/logo-clean.png')
    print("Done")
else:
    print("Original not found!")

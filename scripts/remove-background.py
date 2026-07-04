#!/usr/bin/env python3
"""
Script to remove background from images and make them transparent.
Supports PNG, JPG, JPEG formats.
"""

import sys
from PIL import Image
import os

def remove_background_simple(image_path, output_path=None, threshold=10):
    """
    Simple background removal for images with solid backgrounds.
    Works best when background color is known or uniform.
    
    Args:
        image_path: Path to input image
        output_path: Path to save output (default: adds '_transparent' to filename)
        threshold: Color difference threshold for background removal
    """
    try:
        img = Image.open(image_path)
        
        # Convert to RGBA if not already
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        # Get image data
        data = img.getdata()
        
        # Get the corner pixel color (assuming it's the background)
        corner_color = img.getpixel((0, 0))
        
        # Create new image data with transparency
        new_data = []
        for item in data:
            # Calculate color difference
            if len(item) == 4:  # RGBA
                r, g, b, a = item
            else:  # RGB
                r, g, b = item
                a = 255
            
            # Check if pixel is similar to background
            if len(corner_color) >= 3:
                bg_r, bg_g, bg_b = corner_color[:3]
                diff = abs(r - bg_r) + abs(g - bg_g) + abs(b - bg_b)
                
                if diff < threshold:
                    # Make transparent
                    new_data.append((r, g, b, 0))
                else:
                    new_data.append((r, g, b, a))
            else:
                new_data.append(item)
        
        # Create new image
        img.putdata(new_data)
        
        # Save output
        if output_path is None:
            base, ext = os.path.splitext(image_path)
            output_path = f"{base}_transparent.png"
        
        img.save(output_path, 'PNG')
        print(f"✅ Transparent image saved to: {output_path}")
        return output_path
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def remove_background_advanced(image_path, output_path=None):
    """
    Advanced background removal using edge detection.
    Requires: pip install rembg
    """
    try:
        from rembg import remove
        
        with open(image_path, 'rb') as input_file:
            input_data = input_file.read()
        
        output_data = remove(input_data)
        
        if output_path is None:
            base, ext = os.path.splitext(image_path)
            output_path = f"{base}_transparent.png"
        
        with open(output_path, 'wb') as output_file:
            output_file.write(output_data)
        
        print(f"✅ Transparent image saved to: {output_path}")
        return output_path
        
    except ImportError:
        print("❌ rembg not installed. Install with: pip install rembg")
        print("   Falling back to simple method...")
        return remove_background_simple(image_path, output_path)
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python remove-background.py <image_path> [output_path] [--advanced]")
        print("\nExamples:")
        print("  python remove-background.py logo.png")
        print("  python remove-background.py banner.png output.png")
        print("  python remove-background.py image.jpg --advanced")
        sys.exit(1)
    
    image_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith('--') else None
    use_advanced = '--advanced' in sys.argv
    
    if not os.path.exists(image_path):
        print(f"❌ Error: File not found: {image_path}")
        sys.exit(1)
    
    print(f"🔄 Processing: {image_path}")
    
    if use_advanced:
        remove_background_advanced(image_path, output_path)
    else:
        remove_background_simple(image_path, output_path)


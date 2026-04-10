import sys
import subprocess
try:
    from PIL import Image
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pillow"])
    from PIL import Image

def process_image(filename, outname):
    # Load image, it is a 1024x1024 grid of 2x2 dogs.
    img = Image.open(filename).convert("RGBA")
    w, h = img.size
    
    # We slice it into 4 quadrants
    quads = [
        img.crop((0,         0,         w//2, h//2)),
        img.crop((w//2,      0,         w,    h//2)),
        img.crop((0,         h//2,      w//2, h)),
        img.crop((w//2,      h//2,      w,    h))
    ]
    
    # To remove empty white space:
    def remove_white(im):
        data = im.getdata()
        new_data = []
        for item in data:
            if item[0]>240 and item[1]>240 and item[2]>240:
                new_data.append((255, 255, 255, 0)) # transparent
            else:
                new_data.append(item)
        im.putdata(new_data)
        return im
        
    quads = [remove_white(q) for q in quads]
    
    # Find bounding boxes
    bboxes = [q.getbbox() for q in quads]
    
    # We want a uniform size
    max_w = max(b[2]-b[0] for b in bboxes)
    max_h = max(b[3]-b[1] for b in bboxes)
    
    # We create a new horizontal strip: max_w * 4 width, max_h height
    strip = Image.new("RGBA", (max_w * 4, max_h), (255,255,255,0))
    for i, q in enumerate(quads):
        b = bboxes[i]
        cropped = q.crop(b)
        # paste bottom aligned, horizontally centered in its slot
        paste_x = i * max_w + (max_w - cropped.width) // 2
        paste_y = max_h - cropped.height
        strip.paste(cropped, (paste_x, paste_y))
        
    strip.save(outname)
    print(f"Saved {outname} with frame size {max_w}x{max_h}")

process_image("sprite_running.png", "strip_running.png")
process_image("sprite_eating.png", "strip_eating.png")
process_image("sprite_sitting.png", "strip_sitting.png")

#!/usr/bin/env python3
"""
BOB Image → ASCII Converter

Turns any image into ASCII art using a brightness-mapped character ramp.
Supports color mode (ANSI truecolor), B&W, invert, and file output.

Usage:
  python ascii/img2ascii.py image.jpg
  python ascii/img2ascii.py image.png --width 100 --color
  python ascii/img2ascii.py logo.jpg --invert --save out.txt
  python ascii/img2ascii.py photo.jpg --mode block

Arguments:
  image_path           Path to image (JPEG, PNG, GIF, BMP, WEBP, etc.)
  --width  N           Output width in chars (default: 120)
  --color              ANSI truecolor output
  --invert             Invert brightness (dark→light, light→dark)
  --save   out.txt     Save to file instead of printing
  --mode   [ascii|dense|block|minimal]   Character ramp style
  --contrast N         Contrast boost 1.0–3.0 (default: 1.2)
"""

import sys
import os
import argparse

# ── Check for Pillow ──────────────────────────────────────────────────────────
try:
    from PIL import Image, ImageEnhance, ImageFilter
except ImportError:
    print("\n  BOB ascii: Pillow not installed.")
    print("  Fix:  pip install Pillow\n")
    sys.exit(1)

# ── Character ramps (dark→light luminance) ────────────────────────────────────
RAMPS = {
    'ascii':   ' .\'`^",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
    'dense':   ' .:-=+*#%@',
    'block':   ' ░▒▓█',
    'minimal': ' ·:;!|#@',
    'smooth':  ' ·..::--==++**##%%@@',
}

def parse_args():
    p = argparse.ArgumentParser(add_help=True)
    p.add_argument('image', nargs='?', help='Image path')
    p.add_argument('--width',    type=int,   default=120,      help='Output width')
    p.add_argument('--color',    action='store_true',           help='ANSI truecolor')
    p.add_argument('--invert',   action='store_true',           help='Invert brightness')
    p.add_argument('--save',     type=str,   default=None,      help='Save to file')
    p.add_argument('--mode',     type=str,   default='ascii',   help='Character ramp')
    p.add_argument('--contrast', type=float, default=1.2,       help='Contrast 1.0–3.0')
    p.add_argument('--edge',     action='store_true',           help='Edge-detect overlay')
    return p.parse_args()

def brightness_to_char(brightness, ramp, invert):
    # brightness 0–255. Map to ramp index.
    b = brightness if not invert else (255 - brightness)
    idx = int(b / 255 * (len(ramp) - 1))
    return ramp[idx]

def ansi_color(r, g, b, char):
    return f'\x1b[38;2;{r};{g};{b}m{char}\x1b[0m'

def convert(image_path, width=120, color=False, invert=False,
            mode='ascii', contrast=1.2, edge=False):

    ramp = RAMPS.get(mode, RAMPS['ascii'])

    img = Image.open(image_path)

    # Compute height preserving aspect ratio
    # Terminal chars are ~2× taller than wide → scale height by 0.45
    orig_w, orig_h = img.size
    aspect = orig_h / orig_w
    height = int(width * aspect * 0.45)
    img = img.resize((width, height), Image.LANCZOS)

    # Boost contrast
    if contrast != 1.0:
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(contrast)

    # Edge overlay
    if edge:
        gray_e = img.convert('L').filter(ImageFilter.FIND_EDGES)
        edge_data = list(gray_e.getdata())

    # Get pixel data
    rgb_img  = img.convert('RGB')
    gray_img = img.convert('L')
    rgb_pix  = list(rgb_img.getdata()) if hasattr(rgb_img, 'getdata') else list(rgb_img.tobytes())
    try:
        rgb_pix  = [(rgb_img.getpixel((c, r))) for r in range(height) for c in range(width)]
        gray_pix = [(gray_img.getpixel((c, r))) for r in range(height) for c in range(width)]
    except Exception:
        import struct
        raw_rgb  = rgb_img.tobytes()
        raw_gray = gray_img.tobytes()
        rgb_pix  = [struct.unpack('3B', raw_rgb[i*3:i*3+3]) for i in range(width*height)]
        gray_pix = [raw_gray[i] for i in range(width*height)]

    lines = []
    for row in range(height):
        line = ''
        for col in range(width):
            idx = row * width + col
            gray = gray_pix[idx]

            # Edge overlay: if strong edge pixel, use edge char
            char = brightness_to_char(gray, ramp, invert)
            if edge and edge_data[idx] > 80:
                char = '|' if abs(col - width//2) > abs(row - height//2) else '-'

            if color:
                r, g, b = rgb_pix[idx]
                line += ansi_color(r, g, b, char)
            else:
                line += char
        lines.append(line)

    return '\n'.join(lines)

def main():
    args = parse_args()

    if not args.image:
        print("\n  Usage: python ascii/img2ascii.py image.jpg [--width 100] [--color] [--invert]\n")
        print("  Modes: ascii  dense  block  minimal  smooth")
        print("  Example: python ascii/img2ascii.py photo.png --width 80 --color\n")
        sys.exit(0)

    if not os.path.exists(args.image):
        print(f"\n  File not found: {args.image}\n")
        sys.exit(1)

    print(f"\n  Converting: {args.image}  width:{args.width}  mode:{args.mode}  color:{args.color}\n")

    result = convert(
        args.image,
        width    = args.width,
        color    = args.color,
        invert   = args.invert,
        mode     = args.mode,
        contrast = args.contrast,
        edge     = args.edge,
    )

    if args.save:
        # Strip ANSI for file save
        import re
        clean = re.sub(r'\x1b\[[0-9;]*m', '', result)
        with open(args.save, 'w', encoding='utf-8') as f:
            f.write(clean)
        print(f"  Saved to: {args.save}\n")
    else:
        print(result)
        print()

if __name__ == '__main__':
    main()

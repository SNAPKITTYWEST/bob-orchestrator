#!/usr/bin/env python3
"""
BOB 3D ASCII Renderer

Full 3D pipeline in pure Python stdlib — no pip required.
Torus uses the exact Donut.c algorithm (a1k0n). Cube, sphere, pyramid,
and extruded BOB text use Z-buffer surface sampling.

Shapes:
  torus    — spinning donut (Donut.c by Andy Sloane, exact algorithm)
  cube     — shaded solid cube
  sphere   — raymarched sphere with specular highlight
  pyramid  — ancient geometry
  bob      — "BOB" extruded in 3D
  all      — cycle through all shapes

Usage:
  python ascii/ascii3d.py torus
  python ascii/ascii3d.py cube --anim
  python ascii/ascii3d.py bob --width 100 --height 40
  python ascii/ascii3d.py sphere --frames 1 --save sphere.txt
  python ascii/ascii3d.py all --anim

Options:
  --anim           Continuous rotation animation
  --frames N       Animation frame count (default: 200)
  --fps  N         Target FPS (default: 20)
  --width  W       Screen width  (default: 80)
  --height H       Screen height (default: 40)
  --save   file    Save single frame to file
  --rx, --ry, --rz DEGREES   Rotation for static frame
  --shade [simple|full|block|bold]
"""

import math
import sys
import os
import time
import argparse

SHADE_SIMPLE  = '.,-~:;=!*#$@'          # classic 12-level donut
SHADE_FULL    = " .'`^\",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$"
SHADE_BLOCK   = ' ░▒▓█'
SHADE_BOLD    = ' ·:+=%#@'

def deg(d): return d * math.pi / 180

# ── Torus (exact Donut.c) ─────────────────────────────────────────────────────

def render_torus(W, H, A, B, shade=SHADE_SIMPLE):
    buf  = [' '] * (W * H)
    zbuf = [0.0]  * (W * H)

    sin_A, cos_A = math.sin(A), math.cos(A)
    sin_B, cos_B = math.sin(B), math.cos(B)

    # K1: controls screen-space scale; K2: depth offset
    K1 = W * 0.35
    K2 = 5.0
    cx  = W // 2
    cy  = H // 2

    j = 0.0
    while j < 6.2832:
        cos_j = math.cos(j)
        sin_j = math.sin(j)
        i = 0.0
        while i < 6.2832:
            cos_i = math.cos(i)
            sin_i = math.sin(i)

            # h = cos(j) + 2  (ring center distance from axis)
            h = cos_j + 2.0

            # z-depth denominator (perspective: 1/D)
            # Original: c*h*e + f*g + K2 where c=sin_i, e=sin_A, f=sin_j, g=cos_A
            D = 1.0 / (sin_i * h * sin_A + sin_j * cos_A + K2)

            t = sin_i * h * cos_A - sin_j * sin_A

            x = int(cx + K1 * D * (cos_i * h * cos_B - t * sin_B))
            y = int(cy - K1 * D * 0.5 * (cos_i * h * sin_B + t * cos_B))

            o = x + W * y
            if 0 <= x < W and 0 <= y < H and D > zbuf[o]:
                zbuf[o] = D
                # Luminance (dot of surface normal with light)
                N = int(8.0 * (
                    (sin_j * sin_A - sin_i * cos_j * cos_A) * cos_B
                    - sin_i * cos_j * sin_A
                    - sin_j * cos_A
                    - cos_i * cos_j * sin_B
                ))
                buf[o] = shade[N if 0 <= N < len(shade) else 0]

            i += 0.02
        j += 0.07

    rows = []
    for row in range(H):
        rows.append(''.join(buf[row*W:(row+1)*W]))
    return '\n'.join(rows)

# ── Generic Z-buffer canvas ───────────────────────────────────────────────────

class Canvas:
    def __init__(self, W, H, shade=SHADE_SIMPLE):
        self.W     = W
        self.H     = H
        self.shade = shade
        self.clear()

    def clear(self):
        self.buf   = [[' '] * self.W for _ in range(self.H)]
        self.zbuf  = [[-1e9] * self.W for _ in range(self.H)]

    def plot(self, x, y, z, lum):
        xi, yi = int(round(x)), int(round(y))
        if 0 <= xi < self.W and 0 <= yi < self.H:
            if z > self.zbuf[yi][xi]:
                self.zbuf[yi][xi] = z
                idx = max(0, min(len(self.shade)-1, int(lum * (len(self.shade)-1))))
                self.buf[yi][xi] = self.shade[idx]

    def render(self):
        return '\n'.join(''.join(row) for row in self.buf)

def project(px, py, pz, W, H, fov=5.0, scale=None):
    # scale ≈ min(W,H)*0.9 makes a unit object fill ~half the screen
    s = scale if scale is not None else min(W, H) * 0.9
    d = pz + fov
    if d <= 0: return None, None, None
    ooz = 1.0 / d
    sx = int(W/2 + s * ooz * px * 1.6)   # *1.6 corrects terminal char aspect ratio
    sy = int(H/2 - s * ooz * py)
    return sx, sy, ooz

def norm3(v):
    l = math.sqrt(sum(c*c for c in v))
    return tuple(c/l for c in v) if l > 1e-9 else v

def dot3(a, b):
    return sum(x*y for x,y in zip(a, b))

def rotate(v, rx, ry, rz):
    x, y, z = v
    # Z
    x, y = x*math.cos(rz)-y*math.sin(rz), x*math.sin(rz)+y*math.cos(rz)
    # X
    y, z = y*math.cos(rx)-z*math.sin(rx), y*math.sin(rx)+z*math.cos(rx)
    # Y
    x, z = x*math.cos(ry)+z*math.sin(ry), -x*math.sin(ry)+z*math.cos(ry)
    return x, y, z

# ── Sphere ────────────────────────────────────────────────────────────────────

def render_sphere(canvas, rx, ry, rz):
    light = norm3((0.6, 0.8, -0.5))
    dphi, dtheta = 0.035, 0.018
    phi = 0.0
    while phi < math.pi:
        cp, sp = math.cos(phi), math.sin(phi)
        theta = 0.0
        while theta < 2*math.pi:
            ct, st = math.cos(theta), math.sin(theta)
            x = sp * ct
            y = sp * st
            z = cp
            rx2, ry2, rz2 = rotate((x, y, z), rx, ry, rz)
            sx, sy, ooz = project(rx2, ry2, rz2, canvas.W, canvas.H, fov=3.5)
            if sx is None: theta += dtheta; continue
            n = norm3((rx2, ry2, rz2))
            L = dot3(n, light)
            ref = (2*L*n[0]-light[0], 2*L*n[1]-light[1], 2*L*n[2]-light[2])
            spec = max(0.0, dot3(norm3(ref), (0,0,-1)))**10
            lum = max(0.0, min(1.0, L*0.75 + spec*0.25 + 0.05))
            if 0<=sx<canvas.W and 0<=sy<canvas.H and ooz > canvas.zbuf[sy][sx]:
                canvas.zbuf[sy][sx] = ooz
                idx = max(0, min(len(canvas.shade)-1, int(lum*(len(canvas.shade)-1))))
                canvas.buf[sy][sx] = canvas.shade[idx]
            theta += dtheta
        phi += dphi

# ── Cube ──────────────────────────────────────────────────────────────────────

def render_cube(canvas, rx, ry, rz):
    light = norm3((0.5, 1.0, -0.7))
    W, H = canvas.W, canvas.H

    # 6 faces as dense grid samples
    N = 30          # samples per face edge
    for face in range(6):
        for i in range(N+1):
            for j in range(N+1):
                u = (i/N)*2 - 1
                v = (j/N)*2 - 1
                if   face == 0: p, fn = (u, v,  1), ( 0, 0, 1)
                elif face == 1: p, fn = (u, v, -1), ( 0, 0,-1)
                elif face == 2: p, fn = (u,  1, v), ( 0, 1, 0)
                elif face == 3: p, fn = (u, -1, v), ( 0,-1, 0)
                elif face == 4: p, fn = ( 1, u, v), ( 1, 0, 0)
                else:           p, fn = (-1, u, v), (-1, 0, 0)

                p  = rotate(p,  rx, ry, rz)
                fn = rotate(fn, rx, ry, rz)
                L  = max(0.02, dot3(norm3(fn), light))

                sx, sy, ooz = project(p[0], p[1], p[2], W, H, fov=4.0)
                if sx is None: continue
                if 0<=sx<W and 0<=sy<H and ooz > canvas.zbuf[sy][sx]:
                    canvas.zbuf[sy][sx] = ooz
                    idx = max(0, min(len(canvas.shade)-1, int(L*(len(canvas.shade)-1))))
                    canvas.buf[sy][sx] = canvas.shade[idx]

# ── Pyramid ───────────────────────────────────────────────────────────────────

def render_pyramid(canvas, rx, ry, rz):
    light = norm3((0.4, 1.0, -0.6))
    W, H  = canvas.W, canvas.H
    N = 40

    # 4 triangular faces
    apex  = (0.0, 1.4, 0.0)
    bases = [(-1,-1,-1),(1,-1,-1),(1,-1,1),(-1,-1,1)]
    faces = [
        (apex, bases[0], bases[1]),
        (apex, bases[1], bases[2]),
        (apex, bases[2], bases[3]),
        (apex, bases[3], bases[0]),
    ]
    # Also base
    base_faces = [
        (bases[0], bases[2], bases[1]),
        (bases[0], bases[3], bases[2]),
    ]

    for tri in faces + base_faces:
        a, b, c = [rotate(v, rx, ry, rz) for v in tri]
        e1 = tuple(b[k]-a[k] for k in range(3))
        e2 = tuple(c[k]-a[k] for k in range(3))
        fn = norm3((
            e1[1]*e2[2]-e1[2]*e2[1],
            e1[2]*e2[0]-e1[0]*e2[2],
            e1[0]*e2[1]-e1[1]*e2[0],
        ))
        L = max(0.05, dot3(fn, light))

        for si in range(N+1):
            for sj in range(N-si+1):
                s = si/N
                t = sj/N
                if s+t > 1: continue
                r = 1-s-t
                px = r*a[0] + s*b[0] + t*c[0]
                py = r*a[1] + s*b[1] + t*c[1]
                pz = r*a[2] + s*b[2] + t*c[2]

                sx, sy, ooz = project(px, py, pz, W, H, fov=4.5)
                if sx is None: continue
                if 0<=sx<W and 0<=sy<H and ooz > canvas.zbuf[sy][sx]:
                    canvas.zbuf[sy][sx] = ooz
                    idx = max(0, min(len(canvas.shade)-1, int(L*(len(canvas.shade)-1))))
                    canvas.buf[sy][sx] = canvas.shade[idx]

# ── BOB extruded text ─────────────────────────────────────────────────────────

FONT = {
    'B': [
        "####.",
        "#...#",
        "#...#",
        "####.",
        "#...#",
        "#...#",
        "####.",
    ],
    'O': [
        ".###.",
        "#...#",
        "#...#",
        "#...#",
        "#...#",
        "#...#",
        ".###.",
    ],
}

def render_bob(canvas, rx, ry, rz):
    light = norm3((0.5, 1.0, -0.8))
    W, H  = canvas.W, canvas.H
    cell  = 0.38           # cell size in world units
    depth = 0.7            # extrusion depth

    letters = [('B', -2.0), ('O', 0.05), ('B', 2.1)]

    for letter, x_off in letters:
        grid = FONT.get(letter, [])
        rows = len(grid)
        cols = max(len(r) for r in grid) if grid else 0

        for ri, row in enumerate(grid):
            for ci, ch in enumerate(row):
                if ch != '#': continue
                cx = x_off + ci * cell - (cols * cell / 2)
                cy = -(ri - rows/2.0) * cell

                # Sample front face, back face, and 4 sides of each voxel
                faces_normals = [
                    # (face samples in local space, normal direction)
                    # Front face (z = +depth/2)
                    [(cx + u*cell*0.45, cy + v*cell*0.45, depth/2) for u in (-0.4,0,0.4) for v in (-0.4,0,0.4)],
                    # Back face (z = -depth/2)
                    [(cx + u*cell*0.45, cy + v*cell*0.45, -depth/2) for u in (-0.4,0,0.4) for v in (-0.4,0,0.4)],
                    # Top edge
                    [(cx + u*cell*0.45, cy + cell*0.45, v*depth*0.45) for u in (-0.4,0,0.4) for v in (-0.45,0,0.45)],
                    # Right edge
                    [(cx + cell*0.45, cy + u*cell*0.45, v*depth*0.45) for u in (-0.4,0,0.4) for v in (-0.45,0,0.45)],
                ]
                ns = [(0,0,1),(0,0,-1),(0,1,0),(1,0,0)]

                for fi, (face_pts, fn) in enumerate(zip(faces_normals, ns)):
                    rfn = rotate(fn, rx, ry, rz)
                    L   = max(0.05, dot3(norm3(rfn), light))

                    for pt in face_pts:
                        rp = rotate(pt, rx, ry, rz)
                        sx, sy, ooz = project(rp[0], rp[1], rp[2], W, H, fov=8.0)
                        if sx is None: continue
                        if 0<=sx<W and 0<=sy<H and ooz > canvas.zbuf[sy][sx]:
                            canvas.zbuf[sy][sx] = ooz
                            idx = max(0, min(len(canvas.shade)-1, int(L*(len(canvas.shade)-1))))
                            canvas.buf[sy][sx] = canvas.shade[idx]

# ── Shape registry ────────────────────────────────────────────────────────────

def render_shape(name, canvas, rx, ry, rz, A=None, B=None):
    if name == 'torus':
        canvas.clear()
        frame = render_torus(canvas.W, canvas.H, A or rx, B or ry, canvas.shade)
        # Write back into canvas buf so .render() works
        for i, line in enumerate(frame.split('\n')):
            for j, ch in enumerate(line):
                if j < canvas.W and i < canvas.H:
                    canvas.buf[i][j] = ch
    elif name == 'cube':
        render_cube(canvas, rx, ry, rz)
    elif name == 'sphere':
        render_sphere(canvas, rx, ry, rz)
    elif name == 'pyramid':
        render_pyramid(canvas, rx, ry, rz)
    elif name == 'bob':
        render_bob(canvas, rx, ry, rz)

SHAPES = ['torus','cube','sphere','pyramid','bob']

# ── Argument parsing ──────────────────────────────────────────────────────────

def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument('shape', nargs='?', default='torus',
                   choices=SHAPES+['all'])
    p.add_argument('--anim',   action='store_true')
    p.add_argument('--frames', type=int,   default=200)
    p.add_argument('--fps',    type=float, default=20)
    p.add_argument('--width',  type=int,   default=80)
    p.add_argument('--height', type=int,   default=40)
    p.add_argument('--save',   type=str,   default=None)
    p.add_argument('--rx',     type=float, default=0)
    p.add_argument('--ry',     type=float, default=30)
    p.add_argument('--rz',     type=float, default=20)
    p.add_argument('--shade',  type=str,   default='simple',
                   choices=['simple','full','block','bold'])
    return p.parse_args()

def move_up(n):
    sys.stdout.write(f'\x1b[{n}A\x1b[0G')
    sys.stdout.flush()

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    args = parse_args()

    shade_map = {
        'simple': SHADE_SIMPLE,
        'full':   SHADE_FULL,
        'block':  SHADE_BLOCK,
        'bold':   SHADE_BOLD,
    }
    shade = shade_map[args.shade]
    canvas = Canvas(args.width, args.height, shade)

    shapes = SHAPES if args.shape == 'all' else [args.shape]

    if not args.anim:
        # Static single frame
        rx, ry, rz = deg(args.rx), deg(args.ry), deg(args.rz)
        for shape in shapes:
            canvas.clear()
            render_shape(shape, canvas, rx, ry, rz)
        out = canvas.render()

        if args.save:
            with open(args.save, 'w', encoding='utf-8') as f:
                f.write(out)
            print(f"\n  Saved to: {args.save}")
        else:
            print()
            print(out)
            print()
        return

    # Animation
    print(f"\n  BOB 3D ASCII  [{args.shape}]  {args.width}×{args.height}  Ctrl+C to stop\n")
    A = deg(args.rx)
    B = deg(args.ry)
    C = deg(args.rz)
    first = True
    shape_idx = 0
    frame_time = 1.0 / args.fps

    try:
        for frame in range(args.frames):
            t0 = time.time()
            canvas.clear()

            cur_shape = shapes[(frame // 100) % len(shapes)] if args.shape == 'all' else shapes[0]
            render_shape(cur_shape, canvas, A, B, C)

            out = canvas.render()

            if not first:
                move_up(args.height + 2)
            else:
                first = False

            sys.stdout.write(f'  [{cur_shape}]  frame {frame+1}  \n')
            for line in out.split('\n'):
                sys.stdout.write('  ' + line + '\n')
            sys.stdout.write('\n')
            sys.stdout.flush()

            A += 0.07
            B += 0.03
            C += 0.02

            elapsed = time.time() - t0
            wait = frame_time - elapsed
            if wait > 0:
                time.sleep(wait)

    except KeyboardInterrupt:
        print('\n\n  WORM sealed. BOB holds.\n')

if __name__ == '__main__':
    main()

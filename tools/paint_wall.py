"""Original seeded cave painting: warped sediment, broken seams and dry-brush rock chips.
No source photographs or downloaded art. Run from game/ to regenerate the bundled JPEG.
"""
from pathlib import Path
import random, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy.ndimage import map_coordinates, gaussian_filter
random.seed(8302)
rng=np.random.default_rng(8302)
W,H=1600,1100
y,x=np.mgrid[0:H,0:W].astype(float)
def noise(w,h):
    a=rng.random((h,w)).astype('float32')
    return np.array(Image.fromarray(a,mode='F').resize((W,H),Image.Resampling.BICUBIC))
n=[noise(w,h) for w,h in [(6,5),(14,11),(35,27),(90,65),(210,160),(570,420)]]
warpX=x+95*(n[0]-.5)+30*(n[1]-.5)
warpY=y+125*(n[0]-.5)+40*(n[2]-.5)
# Broken undulating strata, deliberately not a cellular grid.
strata=np.sin(warpX*.042+warpY*.018+9*n[1]+3*n[2])
height=.38*n[1]+.25*n[2]+.18*n[3]+.12*n[4]+.07*n[5]
height+=.13*strata
height=gaussian_filter(height,.7)
dy,dx=np.gradient(height)
relief=np.clip(.70+dx*13-dy*18,.18,1.5)
light=np.exp(-(((x-W*.52)/(W*.45))**2+((y-H*.64)/(H*.68))**2))
base=np.stack([103+76*height,65+58*height,35+37*height],axis=2)
base*=((.29+.82*light)*relief)[:,:,None]
base+=rng.normal(0,1.6,(H,W,1))
# Irregular angular strata: recursively fractured slabs, with no rows, repeating cells,
# regular seed lattice or honeycomb. Large slabs and small fragments mix naturally.
def split(poly,nx,ny,c,side):
    out=[]
    for p,q in zip(poly,poly[1:]+poly[:1]):
        a=p[0]*nx+p[1]*ny-c;b=q[0]*nx+q[1]*ny-c
        if a*side>=0:out.append(p)
        if a*b<0:
            t=a/(a-b);out.append((p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t))
    return out
def area(poly):return abs(sum(p[0]*q[1]-p[1]*q[0] for p,q in zip(poly,poly[1:]+poly[:1])))*.5
rocks=[]
def fracture(poly,depth=0):
    ar=area(poly)
    if depth>15 or ar<random.uniform(450,3600):rocks.append(poly);return
    xs=[p[0] for p in poly];ys=[p[1] for p in poly]
    angle=random.uniform(0,math.pi)
    if max(xs)-min(xs)>2*(max(ys)-min(ys)):angle=random.uniform(-.4,.4)
    if max(ys)-min(ys)>2*(max(xs)-min(xs)):angle=math.pi*.5+random.uniform(-.4,.4)
    nx,ny=math.cos(angle),math.sin(angle)
    vals=[p[0]*nx+p[1]*ny for p in poly];c=min(vals)+(max(vals)-min(vals))*random.uniform(.30,.70)
    for side in [-1,1]:
        q=split(poly,nx,ny,c,side)
        if len(q)>2:fracture(q,depth+1)
fracture([(-50,-50),(W+50,-50),(W+50,H+50),(-50,H+50)])
stone=Image.new('RGB',(W,H),(29,20,13));sd=ImageDraw.Draw(stone)
for poly in rocks:
    cx=sum(p[0] for p in poly)/len(poly);cy=sum(p[1] for p in poly)/len(poly)
    inset=[(cx+(px-cx)*.968,cy+(py-cy)*.968) for px,py in poly]
    lum=.6+.4*math.exp(-(((cx-W*.52)/(W*.5))**2+((cy-H*.65)/(H*.65))**2))
    tone=random.uniform(.84,1.14)*lum
    color=tuple(int(v*tone) for v in [133,91,49]);sd.polygon(inset,fill=color)
    # Broken short highlight along only the bottom-lit edges, not a uniform outline.
    for p,q in zip(inset,inset[1:]+inset[:1]):
        if q[0]-p[0]>0:
            sd.line([p,q],fill=tuple(min(255,int(v*tone)) for v in [163,116,65]),width=random.choice([1,2,3]))
stone=np.asarray(stone.filter(ImageFilter.GaussianBlur(.55))).astype(float)
wx=x+24*(n[1]-.5)+12*(n[2]-.5)
wy=y+32*(n[1]-.5)+12*(n[2]-.5)
stone=np.stack([map_coordinates(stone[:,:,k],[wy,wx],order=1,mode='nearest') for k in range(3)],axis=2)
# Preserve brush pigment and rough relief inside the stone planes, not CGI-flat facets.
base=stone*(.65+.65*(height-.40))[:,:,None]*(.45+.80*relief)[:,:,None]
base*= (.45+.65*light)[:,:,None]
im=Image.fromarray(np.uint8(np.clip(base,0,255)),'RGB').convert('RGBA')
# Hand-like long branching, discontinuous fractures with a lit lower lip.
seams=Image.new('RGBA',(W,H));d=ImageDraw.Draw(seams)
def crack(px,py,angle,length,width,branch=True):
    pts=[(px,py)]
    for _ in range(int(length/14)):
        angle+=random.uniform(-.48,.48)
        px+=math.cos(angle)*random.uniform(8,20);py+=math.sin(angle)*random.uniform(8,20)
        pts.append((px,py))
    d.line([(a+2,b+3) for a,b in pts],fill=(181,121,57,85),width=width+2)
    d.line(pts,fill=(16,10,7,150),width=width,joint='curve')
    if branch and len(pts)>6:
        q=pts[len(pts)//2];crack(*q,angle+random.choice([-1,1])*.9,length*.4,max(1,width-1),False)
for i in range(75):
    crack(random.uniform(-100,W+100),random.uniform(-50,H+50),random.choice([-.9,1.9,2.6])+random.random()*.6,random.uniform(70,360),random.choice([1,2,2,3,4]))
im=Image.alpha_composite(im,seams.filter(ImageFilter.GaussianBlur(.65)))
# Uneven flakes: tapered angular ochre brush marks following the warped strata.
brush=Image.new('RGBA',(W,H));d=ImageDraw.Draw(brush)
for i in range(21000):
    px=random.randrange(W);py=random.randrange(H);l=random.uniform(3,22);w=random.uniform(1.2,6)
    angle=-.8+.5*math.sin(px*.005)+random.uniform(-.6,.6)
    u=(math.cos(angle),math.sin(angle));v=(-u[1],u[0])
    pts=[(px-u[0]*l*.5,py-u[1]*l*.5),(px+v[0]*w,py+v[1]*w),(px+u[0]*l*.6,py+u[1]*l*.6),(px-v[0]*w*.5,py-v[1]*w*.5)]
    warm=random.random()>.46
    col=(209,150,79,random.randrange(8,32)) if warm else (14,10,8,random.randrange(12,46))
    d.polygon(pts,fill=col)
im=Image.alpha_composite(im,brush)
# Soft soot at the margins; leave enough firelit stone to read in shadow rounds.
a=np.asarray(im.convert('RGB')).astype(float)
vig=np.clip(1-.30*((x-W*.5)/(W*.58))**2-.25*((y-H*.56)/(H*.65))**2,.35,1)
a*=vig[:,:,None]
Image.fromarray(np.uint8(np.clip(a,0,255))).save('assets/cave-wall.jpg',quality=94,subsampling=0)

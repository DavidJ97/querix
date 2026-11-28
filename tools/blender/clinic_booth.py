"""Scène « deux postes de vaccination » pour la démo réaliste de Quérix.

Construite entièrement en Python dans Blender (bpy), éclairée de façon physique (Cycles) :
panneaux lumineux du faux plafond, lumière du jour par la fenêtre. Le script peut :
  --preview <png>   faire un rendu de contrôle depuis la caméra du joueur ;
  --bake <dossier>  précalculer l'éclairage (lightmap) et exporter le décor en glTF + l'environnement.

Repère Blender : Z vers le haut, le joueur regarde vers +Y (mur du fond des postes à Y = 4).
Ressources : textures Poly Haven / ambientCG (CC0), modèles Poly Haven (CC0), signalétique générée.
"""
import bpy, bmesh, math, os, sys, time
from mathutils import Vector

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
TEX = os.environ.get('QX_TEX', '/home/claude/querix/apps/web/public/game3d/textures')
RAW = os.environ.get('QX_RAW', '/home/claude/dl/raw')
SIGNS = os.environ.get('QX_SIGNS', '/home/claude/bl')
PROPS = os.environ.get('QX_PROPS', '/home/claude/phm')   # glTF Poly Haven non compressés
W, D, H = 10.0, 8.0, 3.2                # largeur (x), profondeur (y), hauteur
X0, X1, Y0, Y1 = -W / 2, W / 2, -D / 2, D / 2

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
col = scene.collection
STATIC = []                              # objets du décor fixe (reçoivent la lightmap)

# ---------------------------------------------------------------- matériaux
def image(path, color=True):
    img = bpy.data.images.load(path, check_existing=True)
    if not color: img.colorspace_settings.name = 'Non-Color'
    return img

def material(name, color=(0.8, 0.8, 0.8), rough=0.5, metal=0.0, tex=None, normal=None, rough_tex=None,
             scale=1.0, emission=None, strength=0.0, normal_strength=1.0):
    """Principled BSDF. `scale` = taille réelle (m) d'une répétition de texture : les UV sont posées en mètres."""
    m = bpy.data.materials.new(name)
    nt = m.node_tree
    b = nt.nodes.get('Principled BSDF') or nt.nodes.new('ShaderNodeBsdfPrincipled')
    if not b.outputs['BSDF'].links:
        out = nt.nodes.get('Material Output') or nt.nodes.new('ShaderNodeOutputMaterial')
        nt.links.new(b.outputs['BSDF'], out.inputs['Surface'])
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    uv = nt.nodes.new('ShaderNodeUVMap'); uv.uv_map = 'UVMap'
    def tex_node(path, colr):
        n = nt.nodes.new('ShaderNodeTexImage'); n.image = image(path, colr); nt.links.new(uv.outputs['UV'], n.inputs['Vector']); return n
    if tex: nt.links.new(tex_node(tex, True).outputs['Color'], b.inputs['Base Color'])
    if rough_tex: nt.links.new(tex_node(rough_tex, False).outputs['Color'], b.inputs['Roughness'])
    if normal:
        nm = nt.nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = normal_strength
        nt.links.new(tex_node(normal, False).outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
    if emission:
        if isinstance(emission, str): nt.links.new(tex_node(emission, True).outputs['Color'], b.inputs['Emission Color'])
        else: b.inputs['Emission Color'].default_value = (*emission, 1)
        b.inputs['Emission Strength'].default_value = strength
    m['uvscale'] = scale
    return m

M = {
    'floor': material('Sol carrelage', tex=f'{TEX}/tile_color.jpg', normal=f'{TEX}/tile_normal.jpg', rough_tex=f'{TEX}/tile_rough.jpg', scale=4.8, normal_strength=0.6),
    'wall': material('Mur peint', color=(0.82, 0.85, 0.88), rough=0.85, normal=f'{TEX}/plaster_normal.jpg', scale=3.0, normal_strength=0.25),
    'mosaic': material('Mosaique', tex=f'{TEX}/mosaic_color.jpg', normal=f'{TEX}/mosaic_normal.jpg', rough_tex=f'{TEX}/mosaic_rough.jpg', scale=0.6),
    'ceiling': material('Faux plafond', color=(0.9, 0.91, 0.92), rough=0.95, normal=f'{TEX}/tile_normal.jpg', scale=4.8, normal_strength=1.5),
    'panel': material('Panneau lumineux', color=(1, 1, 1), rough=0.4, emission=(1.0, 0.97, 0.92), strength=5.0),
    'curtain': material('Rideau lin', tex=f'{RAW}/rough_linen_color.jpg', normal=f'{RAW}/rough_linen_normal.jpg', rough_tex=f'{RAW}/rough_linen_rough.jpg', scale=0.5, normal_strength=0.5),
    'desk_top': material('Plateau stratifie', color=(0.93, 0.93, 0.92), rough=0.32),
    'veneer': material('Placage okoume', tex=f'{RAW}/okoume_veneer_color.jpg', normal=f'{RAW}/okoume_veneer_normal.jpg', rough_tex=f'{RAW}/okoume_veneer_rough.jpg', scale=1.0, normal_strength=0.3),
    'metal': material('Acier brosse', color=(0.75, 0.76, 0.78), rough=0.28, metal=1.0),
    'black': material('Plastique noir', color=(0.02, 0.022, 0.025), rough=0.35),
    'dark_metal': material('Metal laque noir', color=(0.04, 0.045, 0.05), rough=0.45, metal=0.6),
    'seat': material('Similicuir gris', tex=f'{RAW}/leather_white_color.jpg', normal=f'{RAW}/leather_white_normal.jpg', rough_tex=f'{RAW}/leather_white_rough.jpg', scale=0.3, normal_strength=0.6),
    'belt': material('Sangle bleue', color=(0.05, 0.18, 0.7), rough=0.6),
    'blue': material('Bleu Querix', color=(0.012, 0.09, 0.4), rough=0.5),
    'screen': material('Ecran', emission=f'{SIGNS}/screen.png', strength=2.2, color=(0, 0, 0), rough=0.15),
    'sign3': material('Numero 3', tex=f'{SIGNS}/sign_3.png', rough=0.5, emission=f'{SIGNS}/sign_3.png', strength=0.15),
    'sign4': material('Numero 4', tex=f'{SIGNS}/sign_4.png', rough=0.5, emission=f'{SIGNS}/sign_4.png', strength=0.15),
    'wall_vacc': material('Panneau vaccination', tex=f'{SIGNS}/wall_vacc.png', rough=0.45),
    'wall_fict': material('Panneau fictif', tex=f'{SIGNS}/wall_fict.png', rough=0.6),
    'frame': material('Cadre fenetre', color=(0.85, 0.86, 0.88), rough=0.35, metal=0.4),
}
# Le stratifié et les murs n'ont pas de texture couleur : on les marque pour garder des UV simples.

# ---------------------------------------------------------------- géométrie
def finish(ob, mat, bevel=0.0, smooth=False, static=True):
    ob.data.materials.append(mat)
    if bevel:
        mod = ob.modifiers.new('Biseau', 'BEVEL'); mod.width = bevel; mod.segments = 3
        mod.limit_method = 'ANGLE'; mod.harden_normals = True
    if smooth or bevel:
        for p in ob.data.polygons: p.use_smooth = True
    if static: STATIC.append(ob)
    return ob

def box(name, sx, sy, sz, x, y, z, mat, bevel=0.0, rz=0.0, static=True):
    """Boîte de dimensions (sx, sy, sz) dont la base est à z."""
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(sx, sy, sz), verts=bm.verts)
    bmesh.ops.translate(bm, vec=(0, 0, sz / 2), verts=bm.verts)
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); col.objects.link(ob)
    ob.location = (x, y, z); ob.rotation_euler.z = rz
    return finish(ob, mat, bevel, static=static)

def cyl(name, r, h, x, y, z, mat, seg=24, axis='Z', static=True):
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r, depth=h)
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); col.objects.link(ob)
    ob.location = (x, y, z)
    if axis == 'X': ob.rotation_euler.y = math.pi / 2
    if axis == 'Y': ob.rotation_euler.x = math.pi / 2
    return finish(ob, mat, smooth=True, static=static)

def plane(name, sx, sy, x, y, z, mat, rx=0.0, rz=0.0, static=True):
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5)
    bmesh.ops.scale(bm, vec=(sx, sy, 1), verts=bm.verts)
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); col.objects.link(ob)
    ob.location = (x, y, z); ob.rotation_euler = (rx, 0, rz)
    return finish(ob, mat, static=static)

# Pièce : sol, plafond, murs (fenêtre dans le mur de gauche), soubassement en mosaïque au fond.
plane('Sol', W, D, 0, 0, 0, M['floor'])
plane('Plafond', W, D, 0, 0, H, M['ceiling'], rx=math.pi)
T = 0.15
box('Mur fond', W + 2 * T, T, H, 0, Y1 + T / 2, 0, M['wall'])
box('Mur avant', W + 2 * T, T, H, 0, Y0 - T / 2, 0, M['wall'])
box('Mur droit', T, D, H, X1 + T / 2, 0, 0, M['wall'])
WY0, WY1, WZ0, WZ1 = -2.4, 1.6, 0.9, 2.6       # ouverture de la fenêtre
box('Mur gauche bas', T, D, WZ0, X0 - T / 2, 0, 0, M['wall'])
box('Mur gauche haut', T, D, H - WZ1, X0 - T / 2, 0, WZ1, M['wall'])
box('Mur gauche a', T, WY0 - Y0, WZ1 - WZ0, X0 - T / 2, (Y0 + WY0) / 2, WZ0, M['wall'])
box('Mur gauche b', T, Y1 - WY1, WZ1 - WZ0, X0 - T / 2, (WY1 + Y1) / 2, WZ0, M['wall'])
for i, y in enumerate([WY0, -1.07, 0.27, WY1]):
    box(f'Montant {i}', 0.08, 0.06, WZ1 - WZ0, X0 - 0.04, y, WZ0, M['frame'], bevel=0.008)
box('Appui', 0.25, WY1 - WY0, 0.04, X0 + 0.02, (WY0 + WY1) / 2, WZ0 - 0.04, M['frame'], bevel=0.008)
plane('Mosaique fond', W, 1.25, 0, Y1 - 0.004, 0.625, M['mosaic'], rx=math.pi / 2)
box('Liseré mosaïque', W, 0.02, 0.03, 0, Y1 - 0.01, 1.25, M['metal'])
box('Plinthe', W, 0.02, 0.08, 0, Y0 + 0.01, 0, M['blue'])
box('Plinthe droite', 0.02, D, 0.08, X1 - 0.01, 0, 0, M['blue'])

# Faux plafond : panneaux lumineux (géométrie émissive) + vraies lumières de surface juste dessous.
PANELS = [(-2.6, 2.4), (2.6, 2.4), (-2.6, -0.6), (2.6, -0.6), (0, -2.8), (0, 0.9)]
for i, (x, y) in enumerate(PANELS):
    box(f'Panneau {i}', 1.2, 0.6, 0.03, x, y, H - 0.03, M['panel'])
    L = bpy.data.lights.new(f'Lumiere {i}', 'AREA'); L.shape = 'RECTANGLE'; L.size = 1.2; L.size_y = 0.6
    L.energy = float(os.environ.get('QX_LAMP', 75)); L.color = (1.0, 0.95, 0.88)
    o = bpy.data.objects.new(f'Lumiere {i}', L); col.objects.link(o); o.location = (x, y, H - 0.04)

# Lumière du jour : soleil rasant par la fenêtre + ciel.
sun = bpy.data.lights.new('Soleil', 'SUN'); sun.energy = 3.0; sun.angle = math.radians(3); sun.color = (1.0, 0.93, 0.82)
so = bpy.data.objects.new('Soleil', sun); col.objects.link(so); so.rotation_euler = (math.radians(58), 0, math.radians(-115))
world = bpy.data.worlds.new('Ciel'); scene.world = world
bg = world.node_tree.nodes.get('Background') or world.node_tree.nodes.new('ShaderNodeBackground')
if not bg.outputs[0].links:
    wo = world.node_tree.nodes.get('World Output') or world.node_tree.nodes.new('ShaderNodeOutputWorld')
    world.node_tree.links.new(bg.outputs[0], wo.inputs[0])
bg.inputs['Color'].default_value = (0.55, 0.72, 0.95, 1); bg.inputs['Strength'].default_value = 1.0

# Postes 3 (gauche) et 4 (droite) contre le mur du fond ; cloisons-rideaux à x = -3.4, 0, 3.4.
def curtain(name, x, y0, y1):
    n = 80; me = bpy.data.meshes.new(name); bm = bmesh.new()
    rows = [[bm.verts.new((x + 0.045 * math.sin(i / n * (y1 - y0) * 9), y0 + (y1 - y0) * i / n, z)) for z in (0.25, 2.1)] for i in range(n + 1)]
    for i in range(n): bm.faces.new((rows[i][0], rows[i + 1][0], rows[i + 1][1], rows[i][1]))
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); col.objects.link(ob)
    sol = ob.modifiers.new('Epaisseur', 'SOLIDIFY'); sol.thickness = 0.008
    finish(ob, M['curtain'], smooth=True)
    cyl(name + ' rail', 0.012, y1 - y0 + 0.1, x, (y0 + y1) / 2, 2.15, M['metal'], seg=12, axis='Y')
    cyl(name + ' pied', 0.018, 2.15, x, y0, 0, M['metal'], seg=12)
    o = STATIC[-1]; o.location.z = 1.075

for x in (-3.4, 0.0, 3.4): curtain(f'Rideau {x}', x, Y1 - 1.75, Y1 - 0.02)

def booth(num, cx):
    dy = Y1 - 1.05                                    # centre du bureau
    box(f'Plateau {num}', 1.9, 0.8, 0.035, cx, dy, 0.72, M['desk_top'], bevel=0.01)
    box(f'Facade {num}', 1.86, 0.025, 0.66, cx, dy - 0.37, 0.05, M['veneer'], bevel=0.004)
    for sx in (-0.92, 0.92): box(f'Pied {num}{sx}', 0.04, 0.74, 0.72, cx + sx, dy, 0, M['desk_top'], bevel=0.005)
    box(f'Caisson {num}', 0.42, 0.6, 0.6, cx + 0.68, dy + 0.05, 0.06, M['desk_top'], bevel=0.008)
    # écran sur pied, clavier, souris
    box(f'Ecran {num}', 0.56, 0.035, 0.34, cx - 0.15, dy + 0.18, 0.93, M['black'], bevel=0.006, rz=math.radians(10))
    plane(f'Image ecran {num}', 0.52, 0.30, cx - 0.15 - 0.0035, dy + 0.18 - 0.019, 1.10, M['screen'], rx=math.pi / 2, rz=math.radians(10))
    box(f'Pied ecran {num}', 0.05, 0.05, 0.2, cx - 0.15, dy + 0.2, 0.755, M['dark_metal'])
    box(f'Socle ecran {num}', 0.22, 0.16, 0.012, cx - 0.15, dy + 0.2, 0.755, M['dark_metal'], bevel=0.004)
    box(f'Clavier {num}', 0.44, 0.14, 0.018, cx - 0.12, dy - 0.12, 0.755, M['black'], bevel=0.004)
    box(f'Souris {num}', 0.06, 0.1, 0.025, cx + 0.22, dy - 0.12, 0.755, M['black'], bevel=0.012)
    # chaise de bureau du personnel
    c = (cx + 0.05, Y1 - 0.4)
    box(f'Assise {num}', 0.48, 0.46, 0.08, c[0], c[1], 0.46, M['seat'], bevel=0.025)
    box(f'Dossier {num}', 0.46, 0.06, 0.5, c[0], c[1] + 0.25, 0.6, M['seat'], bevel=0.025)
    cyl(f'Verin {num}', 0.025, 0.4, c[0], c[1], 0.26, M['dark_metal'], seg=16)
    for k in range(5):
        a = k / 5 * 2 * math.pi
        box(f'Branche {num}{k}', 0.3, 0.04, 0.03, c[0] + 0.15 * math.cos(a), c[1] + 0.15 * math.sin(a), 0.05, M['dark_metal'], bevel=0.008, rz=a)
    # numéro suspendu
    box(f'Numero {num}', 0.5, 0.04, 0.5, cx - 0.6, Y1 - 1.9, 2.35, M['sign3' if num == 3 else 'sign4'], bevel=0.006)
    for sx in (-0.18, 0.18): cyl(f'Fil {num}{sx}', 0.003, H - 2.85, cx - 0.6 + sx, Y1 - 1.9, 2.85 + (H - 2.85) / 2, M['dark_metal'], seg=6)

booth(3, -1.7); booth(4, 1.7)
box('Panneau vaccination', 1.6, 0.02, 0.41, 0, Y1 - 0.012, 2.35, M['wall_vacc'], bevel=0.004)
box('Panneau fictif', 3.0, 0.02, 0.375, X1 - 0.012, 0.3, 2.3, M['wall_fict'], rz=math.pi / 2)

# Salle d'attente : rangées de chaises (assise + dossier en similicuir, poutre acier).
def chair_row(name, x0, y, n):
    for i in range(n):
        x = x0 + i * 0.62
        box(f'{name} assise {i}', 0.5, 0.46, 0.07, x, y, 0.42, M['seat'], bevel=0.02)
        box(f'{name} dossier {i}', 0.5, 0.06, 0.42, x, y + 0.24, 0.52, M['seat'], bevel=0.02)
        box(f'{name} support {i}', 0.04, 0.3, 0.05, x, y + 0.08, 0.37, M['metal'], bevel=0.006)
    box(f'{name} poutre', (n - 1) * 0.62 + 0.4, 0.06, 0.05, x0 + (n - 1) * 0.31, y + 0.05, 0.32, M['metal'], bevel=0.008)
    for xx in (x0, x0 + (n - 1) * 0.62):
        box(f'{name} pied {xx:.1f}', 0.05, 0.5, 0.32, xx, y + 0.05, 0, M['metal'], bevel=0.008)
chair_row('Rang A', 1.6, -1.6, 5)
chair_row('Rang B', 1.6, -3.0, 5)

# Guide-file : poteaux noirs, sangle bleue.
POSTS = [(-4.2, 0.9), (-2.6, 0.9), (-1.0, 0.9), (-1.0, -0.6)]
for i, (x, y) in enumerate(POSTS):
    cyl(f'Poteau {i}', 0.03, 0.92, x, y, 0.46, M['dark_metal'], seg=20)
    cyl(f'Socle {i}', 0.17, 0.025, x, y, 0.0125, M['dark_metal'], seg=32)
    cyl(f'Tete {i}', 0.04, 0.06, x, y, 0.95, M['metal'], seg=20)
    if i < len(POSTS) - 1:
        (bx, by) = POSTS[i + 1]; ln = math.hypot(bx - x, by - y)
        box(f'Sangle {i}', ln, 0.006, 0.05, (x + bx) / 2, (y + by) / 2, 0.86, M['belt'], rz=math.atan2(by - y, bx - x))

# Modèles Poly Haven (CC0) : ils projettent leurs ombres dans la lightmap mais sont exportés à part.
PROP_OBJS = []
def prop(name, x, y, z, rz=0.0, k=1.0):
    before = set(bpy.data.objects)
    d = f'{PROPS}/{name}'; bpy.ops.import_scene.gltf(filepath=f'{d}/' + [f for f in os.listdir(d) if f.endswith('.gltf')][0])
    new = [o for o in bpy.data.objects if o not in before]
    root = [o for o in new if o.parent is None]
    for r in root:
        r.location = (x, y, z); r.rotation_euler = (r.rotation_euler.x, r.rotation_euler.y, rz); r.scale = (k, k, k)
    PROP_OBJS.extend(new)
prop('potted_plant_02', -4.3, 3.3, 0, 0.5, 1.45)
prop('potted_plant_02', 4.4, -3.4, 0, 2.0, 1.3)
prop('WetFloorSign_01', -2.2, -2.0, 0, 0.7)
prop('wall_clock', X1 - 0.02, -1.6, 2.5, -math.pi / 2, 1.3)
prop('clipboard', -2.35, Y1 - 1.1, 0.755, 0.3)
prop('clipboard', 1.05, Y1 - 1.1, 0.755, -0.2)

# ---------------------------------------------------------------- UV en mètres (texture à l'échelle réelle)
def apply_and_uv(ob):
    bpy.context.view_layer.objects.active = ob
    for o in bpy.context.selected_objects: o.select_set(False)
    ob.select_set(True)
    for mod in list(ob.modifiers): bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    me = ob.data; s = ob.data.materials[0].get('uvscale', 1.0) if ob.data.materials else 1.0
    uv = me.uv_layers.get('UVMap') or me.uv_layers.new(name='UVMap')
    for poly in me.polygons:
        n = poly.normal; ax = max(range(3), key=lambda i: abs(n[i]))
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            u, v = [(co.y, co.z), (co.x, co.z), (co.x, co.y)][ax]
            if ax == 0 and n.x < 0: u = -u
            if ax == 1 and n.y > 0: u = -u
            uv.data[li].uv = (u / s, v / s)
for ob in STATIC: apply_and_uv(ob)
# Les images (écran, panneaux, numéros) doivent couvrir exactement leur face : UV 0–1 sur la face avant.
for ob in STATIC:
    mn = ob.data.materials[0].name
    if mn in ('Ecran', 'Panneau vaccination', 'Panneau fictif', 'Numero 3', 'Numero 4'):
        me = ob.data; uv = me.uv_layers['UVMap']
        xs = [v.co for v in me.vertices]; n0 = max(range(3), key=lambda i: max(c[i] for c in xs) - min(c[i] for c in xs))
        lo = [min(c[i] for c in xs) for i in range(3)]; hi = [max(c[i] for c in xs) for i in range(3)]
        for poly in me.polygons:
            for li in poly.loop_indices:
                co = me.vertices[me.loops[li].vertex_index].co
                hor = 0 if (hi[0] - lo[0]) > (hi[1] - lo[1]) else 1
                u = (co[hor] - lo[hor]) / max(hi[hor] - lo[hor], 1e-6); v = (co.z - lo[2]) / max(hi[2] - lo[2], 1e-6)
                if (hor == 0 and poly.normal.y > 0.5) or (hor == 1 and poly.normal.x > 0.5): u = 1 - u
                uv.data[li].uv = (u, v)

# ---------------------------------------------------------------- caméra, rendu
cam = bpy.data.cameras.new('Camera'); cam.lens = 22
co = bpy.data.objects.new('Camera', cam); col.objects.link(co)
co.location = (0.2, -3.0, 1.75)
co.rotation_euler = (math.radians(82), 0, math.radians(0))
scene.camera = co
scene.render.engine = 'CYCLES'; scene.cycles.device = 'CPU'
scene.cycles.use_denoising = True
scene.view_settings.view_transform = 'AgX'
scene.view_settings.look = os.environ.get('QX_LOOK', 'AgX - Medium High Contrast')
scene.view_settings.exposure = float(os.environ.get('QX_EXPO', -0.2))

if ARGS and ARGS[0] == '--preview':
    scene.cycles.samples = int(ARGS[2]) if len(ARGS) > 2 else 96
    scene.render.resolution_x, scene.render.resolution_y = (960, 540) if len(ARGS) < 4 else (480, 270)
    scene.render.filepath = ARGS[1]
    t = time.time(); bpy.ops.render.render(write_still=True); print('preview s', round(time.time() - t, 1))

if ARGS and ARGS[0] == '--bake':
    out = ARGS[1]; os.makedirs(out, exist_ok=True)
    size = int(ARGS[2]) if len(ARGS) > 2 else 2048
    samples = int(ARGS[3]) if len(ARGS) > 3 else 128
    # 1) un seul maillage pour le décor fixe, avec une seconde carte UV « Lightmap » sans chevauchement
    for o in bpy.context.selected_objects: o.select_set(False)
    for o in STATIC: o.select_set(True)
    bpy.context.view_layer.objects.active = STATIC[0]
    bpy.ops.object.join(); clinic = bpy.context.view_layer.objects.active; clinic.name = 'Clinique'
    me = clinic.data
    lm = me.uv_layers.new(name='Lightmap'); me.uv_layers.active = lm
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.002, area_weight=1.0, scale_to_bounds=False)
    bpy.ops.uv.pack_islands(margin=0.003, rotate=True)
    bpy.ops.object.mode_set(mode='OBJECT')
    # 2) image cible + nœud actif dans chaque matériau (Cycles cuit dans le nœud image actif)
    img = bpy.data.images.new('Lightmap', size, size, float_buffer=True)
    for m in me.materials:
        nt = m.node_tree; n = nt.nodes.new('ShaderNodeTexImage'); n.image = img; n.name = 'BakeTarget'
        uvn = nt.nodes.new('ShaderNodeUVMap'); uvn.uv_map = 'Lightmap'; nt.links.new(uvn.outputs['UV'], n.inputs['Vector'])
        for x in nt.nodes: x.select = False
        n.select = True; nt.nodes.active = n
    for o in bpy.context.selected_objects: o.select_set(False)
    clinic.select_set(True); bpy.context.view_layer.objects.active = clinic
    scene.cycles.samples = samples; scene.render.bake.margin = 6
    scene.cycles.use_denoising = False
    t = time.time()
    # éclairage reçu (direct + indirect), sans la couleur des matériaux : c'est la lightmap
    bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT', 'INDIRECT'}, use_clear=True, margin=6)
    print('bake s', round(time.time() - t, 1))
    img.filepath_raw = f'{out}/lightmap.exr'; img.file_format = 'OPEN_EXR'; img.save()
    # 3) export glTF du décor (les deux jeux d'UV sont conservés ; le nœud de cuisson est retiré)
    for m in me.materials:
        nt = m.node_tree
        for n in [n for n in nt.nodes if n.name.startswith('BakeTarget') or (n.bl_idname == 'ShaderNodeUVMap' and n.uv_map == 'Lightmap')]: nt.nodes.remove(n)
    for o in bpy.context.selected_objects: o.select_set(False)
    clinic.select_set(True)
    bpy.ops.export_scene.gltf(filepath=f'{out}/clinic_booth.glb', use_selection=True, export_format='GLB',
                              export_texcoords=True, export_normals=True, export_lights=False, export_cameras=False,
                              export_image_format='AUTO')
    # 4) panorama d'environnement (reflets et éclairage des personnages dans le navigateur)
    cam.type = 'PANO'; cam.panorama_type = 'EQUIRECTANGULAR'
    co.location = (0, 0.5, 1.4); co.rotation_euler = (math.radians(90), 0, math.radians(-90))
    scene.render.resolution_x, scene.render.resolution_y = 1024, 512
    scene.cycles.samples = 64; scene.cycles.use_denoising = True
    scene.render.image_settings.file_format = 'OPEN_EXR'; scene.render.image_settings.color_depth = '16'
    scene.render.filepath = f'{out}/env.exr'
    bpy.ops.render.render(write_still=True)
    print('done')

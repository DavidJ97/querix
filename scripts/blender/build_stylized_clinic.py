import bpy, math, pathlib
from mathutils import Vector
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
def mat(name,color,rough=.55):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1); p.inputs['Roughness'].default_value=rough
    return m
white=mat('Warm plaster',(.78,.81,.84)); blue=mat('Medical blue',(.035,.17,.46)); wood=mat('Oak',(.48,.25,.11)); floor=mat('Stone',(.32,.37,.43),.32); metal=mat('Steel',(.48,.52,.57),.28); dark=mat('Monitor',(.025,.035,.05)); green=mat('Active station',(.03,.65,.25))
def cube(name,loc,size,m,bevel=.04):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc); o=bpy.context.object; o.name=name; o.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); o.data.materials.append(m)
    if bevel:
        mod=o.modifiers.new('Rounded edges','BEVEL'); mod.width=bevel; mod.segments=3
        o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return o
def text(label,loc,size=.25):
    bpy.ops.object.text_add(location=loc,rotation=(math.pi/2,0,0)); o=bpy.context.object; o.data.body=label; o.data.align_x='CENTER'; o.data.size=size; o.data.materials.append(white)
    bpy.ops.object.convert(target='MESH')
def light(loc,power,size):
    bpy.ops.object.light_add(type='AREA',location=loc); o=bpy.context.object; o.data.energy=power; o.data.shape='DISK'; o.data.size=size
cube('Floor',(0,0,-.12),(18,14,.24),floor)
cube('Rear wall',(0,6.9,2),(18,.2,4),white)
for x in [-8.9,8.9]: cube('Side wall',(x,0,2),(.2,14,4),white)
labels=['Naissance','Immunite','Vaccins hors pays','Panorama','Symptomes']
for i,label in enumerate(labels):
    x=-6.4+i*3.2
    cube('Station header '+str(i+1),(x,4.6,2.8),(2.8,.24,.85),green if i==0 else blue,.12)
    text(str(i+1)+'  '+label,(x,4.45,2.75),.22)
    for dx in [-1.4,1.4]: cube('Partition',(x+dx,5.6,1.2),(.12,2.3,2.4),white)
    cube('Desk',(x,5.8,.85),(1.9,.8,.16),wood)
    for dx in [-.8,.8]: cube('Desk leg',(x+dx,5.8,.4),(.09,.65,.8),metal)
    cube('Screen',(x,6.05,1.24),(.65,.09,.42),dark)
    cube('Screen stand',(x,6.05,1.01),(.08,.15,.2),metal)
for y in [-3,-1,1,3]:
    for x in [-2,2]:
        bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=.045,depth=1,location=(x,y,.5)); bpy.context.object.data.materials.append(metal)
        bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=.18,depth=.05,location=(x,y,.025)); bpy.context.object.data.materials.append(metal)
    if y<3:
        for x in [-2,2]: cube('Queue belt',(x,y+1,.87),(.035,2,.09),blue,.01)
for y in [-4,-2,0,2]:
    for x in [-7.3,7.3]:
        cube('Seat',(x,y,.48),(.65,.65,.13),blue,.09)
        cube('Backrest',(x,y+.28,.85),(.65,.13,.65),blue,.09)
        for dx in [-.24,.24]: cube('Chair leg',(x+dx,y,.23),(.07,.5,.46),metal)
for y in [-4,0,4]:
    for x in [-5,0,5]:
        cube('Ceiling luminaire',(x,y,3.8),(2,.5,.12),white)
        light((x,y,3.65),350,2)
scene=bpy.context.scene
scene.render.engine='CYCLES'; scene.cycles.samples=32
bpy.ops.object.camera_add(location=(0,-6,2.5)); cam=bpy.context.object; cam.rotation_euler=(Vector((0,4,1.7))-cam.location).to_track_quat('-Z','Y').to_euler(); scene.camera=cam
scene.render.resolution_x=1280; scene.render.resolution_y=720; scene.render.resolution_percentage=100
out=pathlib.Path('next-gen-output'); out.mkdir(exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str((out/'clinic.blend').resolve()))
bpy.ops.export_scene.gltf(filepath=str((out/'clinic.glb').resolve()),export_format='GLB')
scene.render.filepath=str((out/'preview.png').resolve()); bpy.ops.render.render(write_still=True)

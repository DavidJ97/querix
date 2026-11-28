import bpy, sys
src, dst = sys.argv[sys.argv.index('--') + 1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
s = bpy.context.scene
img = bpy.data.images.load(src)
s.render.resolution_x, s.render.resolution_y = img.size
s.render.resolution_percentage = 100
tree = bpy.data.node_groups.new('Debruitage', 'CompositorNodeTree')
s.compositing_node_group = tree
n_in = tree.nodes.new('CompositorNodeImage'); n_in.image = img
den = tree.nodes.new('CompositorNodeDenoise')
out = tree.nodes.new('NodeGroupOutput'); tree.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor')
tree.links.new(n_in.outputs['Image'], den.inputs['Image']); tree.links.new(den.outputs[0], out.inputs[0])
s.render.image_settings.file_format = 'OPEN_EXR' if dst.endswith('.exr') else 'PNG'
s.render.filepath = dst
# rendu « vide » : seul le compositeur produit l'image
s.render.engine = 'BLENDER_WORKBENCH'
s.view_settings.view_transform = 'Standard'; s.view_settings.look = 'None'; s.view_settings.exposure = 0
s.render.image_settings.color_depth = '32' if dst.endswith('.exr') else '8'
bpy.ops.render.render(write_still=True)
print('ok', img.size)

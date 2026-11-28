import bpy, json, pathlib, os
from mathutils import Vector
root=pathlib.Path("apps/web/public/game3d/demo")
source=pathlib.Path(os.environ.get("QUERIX_AUDIT_MODEL", str(root/"clinic_booth.glb"))).resolve()
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source))
report=[]
for obj in bpy.context.scene.objects:
    if obj.type!="MESH": continue
    corners=[obj.matrix_world @ Vector(c) for c in obj.bound_box]
    report.append({"name":obj.name,"vertices":len(obj.data.vertices),"faces":len(obj.data.polygons),"min":[min(v[i] for v in corners) for i in range(3)],"max":[max(v[i] for v in corners) for i in range(3)],"materials":[m.name for m in obj.data.materials if m]})
out=pathlib.Path("blender-audit");out.mkdir(exist_ok=True)
(out/"geometry.json").write_text(json.dumps({"blender":bpy.app.version_string,"source":str(source),"objects":report},indent=2))
print("Audited",len(report),"meshes")
if not report: raise RuntimeError("No meshes imported")

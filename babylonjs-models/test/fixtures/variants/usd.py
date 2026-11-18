"""Writes the USD variant fixtures with OpenUSD's own Python bindings (pip package usd-core).

No npm package writes a binary USD layer or a USDZ package, so these files are written once by
this script and kept in their folders; generate.ts lists them in manifest.json. Run from
babylonjs-models, in an environment with usd-core installed:

    python3 -m venv /tmp/usd && /tmp/usd/bin/pip install usd-core
    /tmp/usd/bin/python test/fixtures/variants/usd.py

Every model is the same 12-triangle cube the other variants draw: blue when plain, green when
textured (an 8 x 8 picture), with a clip named as the FBX and glTF variants name theirs.
"""

import os
import shutil
import struct
import sys
import zlib

from pxr import Gf, Sdf, Usd, UsdGeom, UsdShade, UsdSkel, UsdUtils, Vt

HERE = os.path.dirname(os.path.abspath(__file__))

FACES = [
    ((1, 0, 0), (0, 1, 0), (0, 0, 1)),
    ((-1, 0, 0), (0, 0, 1), (0, 1, 0)),
    ((0, 1, 0), (0, 0, 1), (1, 0, 0)),
    ((0, -1, 0), (1, 0, 0), (0, 0, 1)),
    ((0, 0, 1), (1, 0, 0), (0, 1, 0)),
    ((0, 0, -1), (0, 1, 0), (1, 0, 0)),
]
POINTS, UVS = [], []
for n, u, v in FACES:
    for a, b in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
        POINTS.append(Gf.Vec3f(*[n[k] * 0.5 + u[k] * a * 0.5 + v[k] * b * 0.5 for k in range(3)]))
        UVS.append(Gf.Vec2f((a + 1) / 2, (b + 1) / 2))


def png(rgb, side=8):
    """A square PNG of one color."""
    raw = b"".join(b"\x00" + bytes(rgb) * side for _ in range(side))

    def chunk(kind, data):
        body = kind + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

    head = struct.pack(">IIBBBBB", side, side, 8, 2, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", head) + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b"")


def folder(variant):
    path = os.path.join(HERE, variant)
    shutil.rmtree(path, ignore_errors=True)
    os.makedirs(path)
    return path


def cube(stage, path="/Cube/Mesh", texture=None, color=(0, 0, 1)):
    """The cube mesh, bound to a UsdPreviewSurface material of one color or one picture."""
    UsdGeom.SetStageUpAxis(stage, UsdGeom.Tokens.y)
    UsdGeom.SetStageMetersPerUnit(stage, 1.0)
    # A skinned cube's root is its SkelRoot, defined first; anything else is a plain transform.
    root = stage.GetPrimAtPath("/Cube")
    if not root.IsValid():
        root = UsdGeom.Xform.Define(stage, "/Cube").GetPrim()
    stage.SetDefaultPrim(root)
    mesh = UsdGeom.Mesh.Define(stage, path)
    mesh.CreatePointsAttr(Vt.Vec3fArray(POINTS))
    mesh.CreateFaceVertexCountsAttr([4] * 6)
    mesh.CreateFaceVertexIndicesAttr(list(range(24)))
    mesh.CreateSubdivisionSchemeAttr(UsdGeom.Tokens.none)
    st = UsdGeom.PrimvarsAPI(mesh).CreatePrimvar("st", Sdf.ValueTypeNames.TexCoord2fArray, UsdGeom.Tokens.vertex)
    st.Set(Vt.Vec2fArray(UVS))
    material = UsdShade.Material.Define(stage, "/Cube/Look")
    shader = UsdShade.Shader.Define(stage, "/Cube/Look/Surface")
    shader.CreateIdAttr("UsdPreviewSurface")
    shader.CreateInput("roughness", Sdf.ValueTypeNames.Float).Set(0.8)
    if texture is None:
        shader.CreateInput("diffuseColor", Sdf.ValueTypeNames.Color3f).Set(Gf.Vec3f(*color))
    else:
        reader = UsdShade.Shader.Define(stage, "/Cube/Look/st")
        reader.CreateIdAttr("UsdPrimvarReader_float2")
        reader.CreateInput("varname", Sdf.ValueTypeNames.Token).Set("st")
        picture = UsdShade.Shader.Define(stage, "/Cube/Look/Picture")
        picture.CreateIdAttr("UsdUVTexture")
        picture.CreateInput("file", Sdf.ValueTypeNames.Asset).Set(texture)
        picture.CreateInput("st", Sdf.ValueTypeNames.Float2).ConnectToSource(reader.ConnectableAPI(), "result")
        picture.CreateOutput("rgb", Sdf.ValueTypeNames.Float3)
        shader.CreateInput("diffuseColor", Sdf.ValueTypeNames.Color3f).ConnectToSource(picture.ConnectableAPI(), "rgb")
    material.CreateSurfaceOutput().ConnectToSource(shader.ConnectableAPI(), "surface")
    UsdShade.MaterialBindingAPI.Apply(mesh.GetPrim()).Bind(material)
    return mesh


def spin(stage, prim):
    """A clip that turns the cube a quarter turn about Y in a second (24 time codes)."""
    stage.SetStartTimeCode(0)
    stage.SetEndTimeCode(24)
    stage.SetTimeCodesPerSecond(24)
    op = UsdGeom.Xformable(prim).AddRotateYOp()
    op.Set(0.0, 0)
    op.Set(90.0, 24)


def skinned(stage):
    """A one-joint skeleton the whole cube is bound to, and a clip that turns the joint about Z."""
    stage.SetStartTimeCode(0)
    stage.SetEndTimeCode(24)
    stage.SetTimeCodesPerSecond(24)
    skel_root = UsdSkel.Root.Define(stage, "/Cube")
    skeleton = UsdSkel.Skeleton.Define(stage, "/Cube/Skeleton")
    skeleton.CreateJointsAttr(["joint"])
    identity = Gf.Matrix4d(1)
    skeleton.CreateBindTransformsAttr([identity])
    skeleton.CreateRestTransformsAttr([identity])
    animation = UsdSkel.Animation.Define(stage, "/Cube/Skeleton/Turn")
    animation.CreateJointsAttr(["joint"])
    animation.CreateTranslationsAttr().Set([Gf.Vec3f(0, 0, 0)])
    animation.CreateScalesAttr().Set([Gf.Vec3h(1, 1, 1)])
    rotations = animation.CreateRotationsAttr()
    rotations.Set([Gf.Quatf(1, 0, 0, 0)], 0)
    rotations.Set([Gf.Quatf(Gf.Rotation(Gf.Vec3d(0, 0, 1), 90).GetQuat())], 24)
    UsdSkel.BindingAPI.Apply(skeleton.GetPrim()).CreateAnimationSourceRel().SetTargets([animation.GetPath()])
    mesh = cube(stage)
    binding = UsdSkel.BindingAPI.Apply(mesh.GetPrim())
    binding.CreateSkeletonRel().SetTargets([skeleton.GetPath()])
    binding.CreateJointIndicesPrimvar(False, 1).Set([0] * 24)
    binding.CreateJointWeightsPrimvar(False, 1).Set([1.0] * 24)
    binding.CreateGeomBindTransformAttr(identity)
    UsdSkel.BindingAPI.Apply(skel_root.GetPrim())


def package(layer, path):
    """Write a USDZ package of a layer and the pictures it names."""
    if not UsdUtils.CreateNewUsdzPackage(Sdf.AssetPath(layer), path):
        sys.exit(f"could not package {path}")


def main():
    # .usda: plain text, blue.
    d = folder("usda")
    stage = Usd.Stage.CreateNew(os.path.join(d, "cube.usda"))
    cube(stage)
    stage.Save()

    # .usdc: the same cube as a binary (crate) layer.
    d = folder("usdc")
    stage = Usd.Stage.CreateNew(os.path.join(d, "cube.usdc"))
    cube(stage)
    stage.Save()

    # A root layer that references its mesh in a binary layer, and a picture, in folders beside it.
    d = folder("usd-layers")
    os.makedirs(os.path.join(d, "geo"))
    os.makedirs(os.path.join(d, "textures"))
    with open(os.path.join(d, "textures", "cube.png"), "wb") as f:
        f.write(png((0, 200, 0)))
    geo = Usd.Stage.CreateNew(os.path.join(d, "geo", "cube.usdc"))
    cube(geo, texture="../textures/cube.png")
    geo.Save()
    stage = Usd.Stage.CreateNew(os.path.join(d, "cube.usda"))
    UsdGeom.SetStageUpAxis(stage, UsdGeom.Tokens.y)
    root = stage.DefinePrim("/Cube", "Xform")
    root.GetReferences().AddReference("./geo/cube.usdc")
    stage.SetDefaultPrim(root)
    stage.Save()

    # .usdz: a package of a textured binary layer and its picture.
    d = folder("usdz")
    work = os.path.join(HERE, ".usdz-work")
    shutil.rmtree(work, ignore_errors=True)
    os.makedirs(work)
    with open(os.path.join(work, "cube.png"), "wb") as f:
        f.write(png((0, 200, 0)))
    stage = Usd.Stage.CreateNew(os.path.join(work, "cube.usdc"))
    cube(stage, texture="cube.png")
    stage.Save()
    package(os.path.join(work, "cube.usdc"), os.path.join(d, "cube.usdz"))

    # A Z-up stage: drawn upright, red on top (+Z) and blue below.
    d = folder("usda-z-up")
    stage = Usd.Stage.CreateNew(os.path.join(d, "cube.usda"))
    mesh = cube(stage)
    UsdGeom.SetStageUpAxis(stage, UsdGeom.Tokens.z)
    colors = [Gf.Vec3f(1, 0, 0) if p[2] > 0 else Gf.Vec3f(0, 0, 1) for p in POINTS]
    mesh.CreateDisplayColorPrimvar(UsdGeom.Tokens.vertex).Set(Vt.Vec3fArray(colors))
    stage.GetPrimAtPath("/Cube/Look").SetActive(False)
    stage.Save()

    # A rigid clip.
    d = folder("usda-animated")
    stage = Usd.Stage.CreateNew(os.path.join(d, "cube.usda"))
    cube(stage)
    spin(stage, stage.GetPrimAtPath("/Cube"))
    stage.Save()

    # A skinned clip, packaged.
    d = folder("usdz-skinned-animated")
    shutil.rmtree(work, ignore_errors=True)
    os.makedirs(work)
    stage = Usd.Stage.CreateNew(os.path.join(work, "cube.usdc"))
    skinned(stage)
    stage.Save()
    package(os.path.join(work, "cube.usdc"), os.path.join(d, "cube.usdz"))
    shutil.rmtree(work, ignore_errors=True)



def composed():
    """Stages that draw a mesh more times than a layer writes it, in text and binary alike: five
    internal references to one cube, four references to a cube in another layer, a point instancer
    of ten cubes, a cube whose faces are written only as time samples, and a layer that references
    a cube in a .usdz beside it (and a package that holds both)."""
    d = folder("usd-composed")
    for ext in ("usda", "usdc"):
        stage = Usd.Stage.CreateNew(os.path.join(d, f"internal.{ext}"))
        cube(stage)
        for i in range(5):
            copy = stage.DefinePrim(f"/Copies/C{i}", "Xform")
            copy.GetReferences().AddInternalReference("/Cube")
            UsdGeom.Xformable(copy).AddTranslateOp().Set(Gf.Vec3d(2 * (i + 1), 0, 0))
        stage.Save()

        stage = Usd.Stage.CreateNew(os.path.join(d, f"external.{ext}"))
        UsdGeom.SetStageUpAxis(stage, UsdGeom.Tokens.y)
        root = stage.DefinePrim("/Root", "Xform")
        stage.SetDefaultPrim(root)
        for i in range(4):
            copy = stage.DefinePrim(f"/Root/C{i}", "Xform")
            copy.GetReferences().AddReference("./geo.usdc")
            UsdGeom.Xformable(copy).AddTranslateOp().Set(Gf.Vec3d(2 * i, 0, 0))
        stage.Save()

        stage = Usd.Stage.CreateNew(os.path.join(d, f"instancer.{ext}"))
        UsdGeom.SetStageUpAxis(stage, UsdGeom.Tokens.y)
        instancer = UsdGeom.PointInstancer.Define(stage, "/Inst")
        stage.SetDefaultPrim(instancer.GetPrim())
        cube(stage, "/Inst/Protos/Cube")
        instancer.CreatePrototypesRel().SetTargets([Sdf.Path("/Inst/Protos/Cube")])
        instancer.CreateProtoIndicesAttr([0] * 10)
        instancer.CreatePositionsAttr([Gf.Vec3f(2 * i, 0, 0) for i in range(10)])
        stage.Save()

        stage = Usd.Stage.CreateNew(os.path.join(d, f"timesampled.{ext}"))
        mesh = cube(stage)
        counts = mesh.GetFaceVertexCountsAttr()
        counts.Clear()
        counts.Set([4] * 6, 0)
        counts.Set([4] * 6, 1)
        stage.Save()

    geo = Usd.Stage.CreateNew(os.path.join(d, "geo.usdc"))
    cube(geo)
    geo.Save()

    work = os.path.join(HERE, ".usdz-work")
    shutil.rmtree(work, ignore_errors=True)
    os.makedirs(work)
    inner = Usd.Stage.CreateNew(os.path.join(work, "inner.usdc"))
    cube(inner)
    inner.Save()
    package(os.path.join(work, "inner.usdc"), os.path.join(d, "inner.usdz"))
    stage = Usd.Stage.CreateNew(os.path.join(d, "nested.usda"))
    UsdGeom.SetStageUpAxis(stage, UsdGeom.Tokens.y)
    root = stage.DefinePrim("/Root", "Xform")
    root.GetReferences().AddReference("./inner.usdz")
    stage.SetDefaultPrim(root)
    stage.Save()
    package(os.path.join(d, "nested.usda"), os.path.join(d, "nested.usdz"))
    shutil.rmtree(work, ignore_errors=True)


if sys.argv[1:] == ["composed"]:
    composed()
else:
    main()

#!/usr/bin/env python3
"""Prépare les GLB du mini-jeu « Cosmetic Smash » pour le web.

  python3 tools/optimize-smash-glb.py <dossier des GLB entiers> <dossier des GLB découpés> <dossier de sortie>

Ce que fait le script (les fichiers d'origine ne sont jamais modifiés) :
  1. Pots texturés (jar, pump) : ne garde que la texture de COULEUR, redimensionnée à 512 × 512 et ré-encodée en JPEG.
     Les textures « métal/rugosité » et « normales » (2048 × 2048, ~2 Mo chacune) sont retirées : le jeu les remplace par
     un éclairage simple. 5 Mo → ~0,3 Mo.
  2. Pots procéduraux (bottle, spray, tube) : les versions découpées ont PERDU leurs couleurs (un seul matériau, la
     crème). On les restitue à partir de la version entière (même ordre de pièces).
  3. Les pots procéduraux sont modélisés « Z vers le haut » (glTF est « Y vers le haut ») : on ajoute à leurs nœuds
     une rotation de −90° autour de X pour les redresser, sans toucher aux sommets.
Dépendance : Pillow (pip install pillow).
"""
import io
import json
import struct
import sys
from pathlib import Path

from PIL import Image

TEXTURE_SIZE = 512
JPEG_QUALITY = 84
KINDS = ["bottle", "jar", "pump", "spray", "tube"]
Z_UP_TO_Y_UP = [-0.7071067811865476, 0.0, 0.0, 0.7071067811865476]  # −90° autour de X


def read_glb(path: Path):
    data = path.read_bytes()
    magic, version, _length = struct.unpack("<4sII", data[:12])
    if magic != b"glTF" or version != 2:
        raise ValueError(f"{path} n'est pas un GLB 2.0")
    offset, js, binary = 12, None, b""
    while offset < len(data):
        chunk_length, chunk_type = struct.unpack("<II", data[offset : offset + 8])
        chunk = data[offset + 8 : offset + 8 + chunk_length]
        if chunk_type == 0x4E4F534A:
            js = json.loads(chunk)
        elif chunk_type == 0x004E4942:
            binary = chunk
        offset += 8 + chunk_length
    return js, binary


def write_glb(path: Path, js: dict, binary: bytes) -> None:
    json_bytes = json.dumps(js, separators=(",", ":")).encode()
    json_bytes += b" " * ((4 - len(json_bytes) % 4) % 4)
    binary += b"\x00" * ((4 - len(binary) % 4) % 4)
    total = 12 + 8 + len(json_bytes) + 8 + len(binary)
    path.write_bytes(
        struct.pack("<4sII", b"glTF", 2, total)
        + struct.pack("<II", len(json_bytes), 0x4E4F534A) + json_bytes
        + struct.pack("<II", len(binary), 0x004E4942) + binary
    )


def shrink_textured(js: dict, binary: bytes) -> tuple[dict, bytes]:
    """Garde la texture de couleur (512 px, JPEG), retire le reste des images."""
    views = js["bufferViews"]
    color_images = set()
    for material in js.get("materials", []):
        pbr = material.setdefault("pbrMetallicRoughness", {})
        texture = pbr.get("baseColorTexture")
        if texture is not None:
            color_images.add(js["textures"][texture["index"]]["source"])
    if not color_images:
        return js, binary
    if len(color_images) != 1:
        raise ValueError("Une seule texture de couleur attendue.")
    image_index = color_images.pop()
    image_view = views[js["images"][image_index]["bufferView"]]
    start = image_view.get("byteOffset", 0)
    picture = Image.open(io.BytesIO(binary[start : start + image_view["byteLength"]])).convert("RGB")
    picture = picture.resize((TEXTURE_SIZE, TEXTURE_SIZE), Image.LANCZOS)
    out = io.BytesIO()
    picture.save(out, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)

    image_view_ids = {image["bufferView"] for image in js["images"]}
    new_binary, mapping, new_views = bytearray(), {}, []
    for old_index, view in enumerate(views):
        if old_index in image_view_ids:
            continue
        begin = view.get("byteOffset", 0)
        chunk = binary[begin : begin + view["byteLength"]]
        new_binary += b"\x00" * ((4 - len(new_binary) % 4) % 4)
        mapping[old_index] = len(new_views)
        new_views.append({**view, "byteOffset": len(new_binary)})
        new_binary += chunk
    new_binary += b"\x00" * ((4 - len(new_binary) % 4) % 4)
    image_bytes = out.getvalue()
    new_views.append({"buffer": 0, "byteOffset": len(new_binary), "byteLength": len(image_bytes)})
    new_binary += image_bytes

    for accessor in js["accessors"]:
        if "bufferView" in accessor:
            accessor["bufferView"] = mapping[accessor["bufferView"]]
    js["bufferViews"] = new_views
    js["images"] = [{"bufferView": len(new_views) - 1, "mimeType": "image/jpeg"}]
    js["textures"] = [{"source": 0}]
    js["buffers"] = [{"byteLength": len(new_binary)}]
    for material in js.get("materials", []):
        pbr = material["pbrMetallicRoughness"]
        if "baseColorTexture" in pbr:
            pbr["baseColorTexture"] = {"index": 0}
            pbr.pop("metallicRoughnessTexture", None)
            material.pop("normalTexture", None)
            pbr["metallicFactor"] = 0.0
            pbr["roughnessFactor"] = 0.5
    return js, bytes(new_binary)


def restore_colors(cut: dict, whole: dict, kind: str) -> None:
    """Redonne aux pièces découpées les matériaux de la version entière (même ordre de pièces)."""
    whole_primitives = [p for mesh in whole["meshes"] for p in mesh["primitives"]]
    groups: list[str] = []
    node_group = {}
    for node_index, node in enumerate(cut["nodes"]):
        name = node.get("name", "")
        if name.endswith("cream_core"):
            continue
        parts = name.split("_")
        token = parts[-2]  # <genre>_<nom d'origine>_<empreinte>_<left|right>
        if token not in groups:
            groups.append(token)
        node_group[node_index] = groups.index(token)
    if len(groups) != len(whole_primitives):
        raise ValueError(f"{kind}: {len(groups)} groupes découpés pour {len(whole_primitives)} pièces entières")
    cream_old = cut["materials"][0]
    base = len(whole["materials"])
    cut["materials"] = [*whole["materials"], cream_old]
    cream_index = base
    for node_index, node in enumerate(cut["nodes"]):
        for primitive in cut["meshes"][node["mesh"]]["primitives"]:
            if node_index in node_group:
                primitive["material"] = whole_primitives[node_group[node_index]]["material"]
            else:
                primitive["material"] = cream_index


def stand_upright(js: dict) -> None:
    for node_index in js["scenes"][js.get("scene", 0)]["nodes"]:
        js["nodes"][node_index]["rotation"] = Z_UP_TO_Y_UP


def main(whole_dir: Path, cut_dir: Path, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    for kind in KINDS:
        whole_js, whole_bin = read_glb(whole_dir / f"{kind}.glb")
        cut_js, cut_bin = read_glb(cut_dir / f"{kind}-cut.glb")
        textured = bool(whole_js.get("images"))
        if textured:
            whole_js, whole_bin = shrink_textured(whole_js, whole_bin)
            cut_js, cut_bin = shrink_textured(cut_js, cut_bin)
        else:
            restore_colors(cut_js, whole_js, kind)
            stand_upright(whole_js)
            stand_upright(cut_js)
        write_glb(out_dir / f"{kind}.glb", whole_js, whole_bin)
        write_glb(out_dir / f"{kind}-cut.glb", cut_js, cut_bin)
        sizes = (out_dir / f"{kind}.glb").stat().st_size, (out_dir / f"{kind}-cut.glb").stat().st_size
        print(f"{kind:7s} entier {sizes[0] / 1024:7.0f} Ko   découpé {sizes[1] / 1024:7.0f} Ko")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]))

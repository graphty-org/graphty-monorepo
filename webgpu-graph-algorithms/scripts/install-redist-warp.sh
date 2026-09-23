#!/usr/bin/env bash
# Microsoft's redistributable software renderer, put where the host process loads it instead of the one built
# into Windows. Windows only.
#
#     scripts/install-redist-warp.sh [line-prefix]
#
# WHY. On Dawn's D3D12 backend over the Microsoft Basic Render Driver -- the renderer Windows ships, adapter
# description "D3D12 driver version 10.0.26100.33296" -- a compute shader that passes a value across a workgroup
# barrier returns wrong answers, intermittently. A two-block exclusive prefix sum came back with a block total of
# 1 where 256 belonged, or with a block nothing wrote at all, and everything above the scan was wrong with it:
# the histogram, the radix sort, the grid build and every layout over them, eighteen test files. It is not this
# package's shader and not the shader compiler: three repairs were tried and the third failed byte for byte like
# the first, and copying the library below made every one of those files pass with the kernels untouched
# (docs/decisions/device-self-check.md; gfx-rs/wgpu issue 7904 is the same symptom through another toolchain).
#
# The library is copied into two directories, because either could be the one the loader reaches first: the
# directory of the runner's node.exe, and the directory of the dawn-node addon, which is searched first for the
# addon's own dependencies and is where its d3dcompiler_47.dll already sits. Only a process loading from one of
# those is moved onto it -- a browser started later still gets the renderer in the box.
#
# It prints the adapter description before and after under a marker, so the log of any run says which renderer
# the job actually computed on, and it FAILS when the description does not carry the version below: a silent
# fallback to the broken renderer would make a green run meaningless.

set -u

# PINNED deliberately, not "latest". This exact version is the one measured on the runner -- it turns the
# adapter description into "1.0.21.0" and takes the eighteen failing files green -- and NuGet's unversioned URL
# hands back whatever shipped most recently, which would change what the lane runs under with no commit here and
# no way to read which renderer an older run used. Move it when a newer release is wanted for a reason that is
# written down (a driver fix this package needs, or this one disappearing), in one commit that also records the
# run it was measured on.
WARP_VERSION=1.0.21

prefix=${1:-[warp-redist]}
say() { echo "$prefix $*"; }

dir=tmp/warp-redist
mkdir -p "$dir"

# Sets $desc from a fresh adapter report written to $1: the value of the first "description" of
# scripts/gpu-report.js's JSON, which is the adapter's.
desc=""
describe() {
    local code
    node scripts/gpu-report.js >"$1" 2>"$1.err"
    code=$?
    desc=$(grep -m1 '"description"' "$1" | sed -E 's/^.*"description": *"//; s/",?$//')
    if [ -z "$desc" ]; then
        desc="(none -- gpu-report.js exited $code, see $1.err)"
    fi
}

describe "$dir/report-before.json"
before=$desc
say "adapter description before: $before"
inbox=$(powershell -Command '(Get-Item C:\Windows\System32\d3d10warp.dll).VersionInfo.FileVersion' | tr -d '\r') || true
say "the renderer in the box is d3d10warp.dll ${inbox:-(unreadable)}"

if ! curl -sSL -o "$dir/warp.zip" "https://www.nuget.org/api/v2/package/Microsoft.Direct3D.WARP/$WARP_VERSION"; then
    say "FAILED: could not download Microsoft.Direct3D.WARP $WARP_VERSION from NuGet"
    exit 1
fi
if ! powershell -Command "Expand-Archive -Path $dir/warp.zip -DestinationPath $dir/warp -Force"; then
    say "FAILED: could not unpack $dir/warp.zip"
    exit 1
fi
say "package $(grep -m1 -o '<version>[^<]*' "$dir"/warp/*.nuspec || true)"

dll=$(find "$dir/warp" -iname d3d10warp.dll -ipath '*x64*' | head -1)
if [ -z "$dll" ]; then
    say "FAILED: no x64 d3d10warp.dll inside the package"
    exit 1
fi
# node prints the addon's directory itself, with forward slashes: `require.resolve` hands back a C:\... path,
# and dirname would make "." of it in the runner's Git bash.
dawndir=$(node -e "const p=require('path');console.log(p.join(p.dirname(require.resolve('webgpu/package.json')),'dist').split(p.sep).join('/'))")
for target in "$(dirname "$(command -v node)")" "$dawndir"; do
    if ! cp "$dll" "$target/"; then
        say "FAILED: could not copy $dll into $target"
        exit 1
    fi
    say "copied to $target"
done

describe "$dir/report-after.json"
after=$desc
say "adapter description after:  $after"
case "$after" in
    *"$WARP_VERSION"*)
        say "the redistributable renderer answered: this job computes on Microsoft.Direct3D.WARP $WARP_VERSION"
        ;;
    *)
        say "FAILED: the description does not name $WARP_VERSION, so the copied library was not loaded and this"
        say "FAILED: job is still on the renderer that computes wrong answers. Anything green here is meaningless."
        exit 1
        ;;
esac

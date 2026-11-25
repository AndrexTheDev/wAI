#!/usr/bin/env bash
# Regenerates the Play Store image assets from the real launcher icon.
#   bash tools/make-store-assets.sh
# Requires ImageMagick (`convert`) and the DejaVu fonts (available on Debian/Ubuntu).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/packages/app/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png"
OUT="$ROOT/store/assets"
FONT_BOLD=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
FONT_REG=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf
mkdir -p "$OUT"

# App icon: Play requires 512x512, 32-bit PNG, no transparency.
convert "$SRC" -filter Lanczos -resize 512x512 -background "#070b14" -alpha remove -alpha off "$OUT/icon-512.png"

# Feature graphic: 1024x500, dark aurora gradient, icon tile + claim.
convert -size 1024x500 gradient:"#101a2b-#05080f" \
  \( -size 1024x500 xc:none -fill "#6ee7b7" -draw "circle 150,250 150,120" -blur 0x90 -alpha set -channel A -evaluate multiply 0.20 +channel \) -compose over -composite \
  \( -size 1024x500 xc:none -fill "#38bdf8" -draw "circle 300,420 300,300" -blur 0x90 -alpha set -channel A -evaluate multiply 0.18 +channel \) -compose over -composite \
  \( -size 1024x500 xc:none -fill "#a78bfa" -draw "circle 900,80 900,-40" -blur 0x100 -alpha set -channel A -evaluate multiply 0.16 +channel \) -compose over -composite \
  -stroke none \
  -fill "#070b14" -stroke "#2a3a52" -strokewidth 2 -draw "roundrectangle 66,72 386,428 30,30" \
  \( "$OUT/icon-512.png" -resize 250x250 \) -gravity northwest -geometry +101+125 -composite \
  -stroke none \
  -font "$FONT_BOLD" -pointsize 58 -fill "#eaf0fb" -annotate +400+152 "Nie wieder" \
  -font "$FONT_BOLD" -pointsize 58 -fill "#eaf0fb" -annotate +400+222 "suchen." \
  -font "$FONT_REG" -pointsize 34 -fill "#b7c3d6" -annotate +402+302 "Auch ohne GPS und Internet." \
  -font "$FONT_BOLD" -pointsize 22 -fill "#6ee7b7" -annotate +402+368 "wAI  ·  Anker setzen. Zurückfinden." \
  -depth 8 "$OUT/feature-graphic-1024x500.png"

echo "written:"
identify "$OUT"/icon-512.png "$OUT"/feature-graphic-1024x500.png

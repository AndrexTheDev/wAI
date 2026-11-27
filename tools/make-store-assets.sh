#!/usr/bin/env bash
# Baut die Play-Store-Bilder: Feature-Grafik (1024×500) und die Kachel fürs Listing.
# Das App-Icon selbst kommt aus tools/make-icons.mjs – es darf nur *eine* Quelle geben.
#   bash tools/make-store-assets.sh
# Braucht ImageMagick (`convert`) und die DejaVu-Schriften (Debian/Ubuntu).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/store/assets"
MARK="$OUT/icon-mark-1024.png"
FONT_BOLD=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
FONT_REG=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf
mkdir -p "$OUT"

if [ ! -f "$MARK" ]; then
  echo "✖ $MARK fehlt – zuerst: node tools/make-icons.mjs"
  exit 1
fi

# Feature-Grafik: 1024×500, Aurora-Hintergrund, Marke auf Kachel + Aussage.
convert -size 1024x500 gradient:"#122233-#05080f" \
  \( -size 1024x500 xc:none -fill "#6ee7b7" -draw "circle 150,250 150,110" -blur 0x90 -alpha set -channel A -evaluate multiply 0.18 +channel \) -compose over -composite \
  \( -size 1024x500 xc:none -fill "#4f9dff" -draw "circle 330,430 330,300" -blur 0x90 -alpha set -channel A -evaluate multiply 0.16 +channel \) -compose over -composite \
  \( -size 1024x500 xc:none -fill "#a78bfa" -draw "circle 900,80 900,-60" -blur 0x100 -alpha set -channel A -evaluate multiply 0.14 +channel \) -compose over -composite \
  -stroke none \
  \( "$ROOT/store/assets/icon-512.png" -resize 260x260 \) -gravity northwest -geometry +74+120 -composite \
  -font "$FONT_BOLD" -pointsize 58 -fill "#eaf0fb" -annotate +392+150 "Nie wieder" \
  -font "$FONT_BOLD" -pointsize 58 -fill "#eaf0fb" -annotate +392+220 "suchen." \
  -font "$FONT_REG" -pointsize 34 -fill "#b7c3d6" -annotate +394+300 "Auch ohne GPS und Internet." \
  -font "$FONT_BOLD" -pointsize 22 -fill "#6ee7b7" -annotate +394+366 "wAI  ·  Anker setzen. Zurückfinden." \
  -depth 8 "$OUT/feature-graphic-1024x500.png"

echo "written:"
identify "$OUT"/feature-graphic-1024x500.png

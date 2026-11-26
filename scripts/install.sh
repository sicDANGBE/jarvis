#!/bin/sh
# Installation de Jarvis pour l'utilisateur courant, sans droits administrateur.
#
#   curl -fsSL https://raw.githubusercontent.com/sicDANGBE/jarvis/main/scripts/install.sh | sh
#
# Options (après « sh -s -- » quand le script est lu depuis curl) :
#   --channel stable|nightly   canal à installer (défaut : dernière version stable, sinon nightly)
#   --uninstall                retire Jarvis (les données de ~/.config/Jarvis sont conservées)
#
# Le script télécharge l'AppImage de la release GitHub, vérifie son empreinte SHA-256, puis
# l'extrait dans ~/.local/share/jarvis/app. L'extraction évite de dépendre de FUSE (libfuse2),
# souvent absent et dont l'installation demande les droits root. Il crée la commande
# ~/.local/bin/jarvis, l'icône et l'entrée du menu des applications. Relancé, il met à jour.
set -eu

REPO="sicDANGBE/jarvis"
API="https://api.github.com/repos/$REPO/releases"
DATA_HOME="${XDG_DATA_HOME:-$HOME/.local/share}"
INSTALL_DIR="$DATA_HOME/jarvis"
BIN_DIR="$HOME/.local/bin"
DESKTOP_FILE="$DATA_HOME/applications/jarvis.desktop"
ICON_ROOT="$DATA_HOME/icons/hicolor"

channel=""
action="install"
while [ $# -gt 0 ]; do
  case "$1" in
    --channel) channel="${2:-}"; shift 2 ;;
    --channel=*) channel="${1#--channel=}"; shift ;;
    --uninstall) action="uninstall"; shift ;;
    -h | --help) sed -n '2,13p' "$0" 2>/dev/null || true; exit 0 ;;
    *) echo "jarvis : option inconnue : $1" >&2; exit 2 ;;
  esac
done

say() { printf '%s\n' "jarvis : $*"; }
fail() { printf '%s\n' "jarvis : $*" >&2; exit 1; }

if [ "$(id -u)" = "0" ]; then
  fail "lancez ce script avec votre compte utilisateur, pas en root ni avec sudo."
fi

refresh_desktop_caches() {
  command -v update-desktop-database >/dev/null 2>&1 &&
    update-desktop-database "$DATA_HOME/applications" >/dev/null 2>&1 || true
  command -v gtk-update-icon-cache >/dev/null 2>&1 &&
    gtk-update-icon-cache -q -t "$ICON_ROOT" >/dev/null 2>&1 || true
}

if [ "$action" = "uninstall" ]; then
  rm -rf "$INSTALL_DIR"
  rm -f "$BIN_DIR/jarvis" "$DESKTOP_FILE"
  find "$ICON_ROOT" -path '*/apps/jarvis.png' -type f -exec rm -f {} + 2>/dev/null || true
  refresh_desktop_caches
  say "désinstallé. Vos données restent dans ~/.config/Jarvis."
  exit 0
fi

[ "$(uname -s)" = "Linux" ] || fail "ce script installe la version Linux uniquement."
[ "$(uname -m)" = "x86_64" ] || fail "seule l'architecture x86_64 est publiée."
for tool in curl sha256sum; do
  command -v "$tool" >/dev/null 2>&1 || fail "outil manquant : $tool"
done

# Récupère une release : la dernière stable, ou la pré-release « nightly ».
release_json() {
  curl -fsSL -H "Accept: application/vnd.github+json" "$1" 2>/dev/null
}
case "$channel" in
  stable) json=$(release_json "$API/latest") || fail "aucune version stable publiée." ;;
  nightly) json=$(release_json "$API/tags/nightly") || fail "aucune version nightly publiée." ;;
  "")
    json=$(release_json "$API/latest") || json=$(release_json "$API/tags/nightly") ||
      fail "aucune release trouvée sur https://github.com/$REPO/releases"
    ;;
  *) fail "canal inconnu : $channel (stable ou nightly)" ;;
esac

asset_url() {
  printf '%s\n' "$json" | tr ',' '\n' | sed -n 's/.*"browser_download_url" *: *"\([^"]*\)".*/\1/p' |
    grep -E "$1" | head -n 1
}
appimage_url=$(asset_url '/jarvis-[^/]*-x86_64\.AppImage$')
sums_url=$(asset_url '/SHA256SUMS\.txt$')
[ -n "$appimage_url" ] || fail "aucune AppImage x86_64 dans cette release."
[ -n "$sums_url" ] || fail "SHA256SUMS.txt absent de cette release."
appimage_name=${appimage_url##*/}
version=$(printf '%s' "$appimage_name" | sed 's/^jarvis-\(.*\)-x86_64\.AppImage$/\1/')

if [ -f "$INSTALL_DIR/version" ] && [ "$(cat "$INSTALL_DIR/version")" = "$version" ] &&
  [ -x "$INSTALL_DIR/app/AppRun" ]; then
  say "la version $version est déjà installée."
  exit 0
fi

mkdir -p "$INSTALL_DIR"
work=$(mktemp -d "$INSTALL_DIR/.install.XXXXXX")
trap 'rm -rf "$work"' EXIT INT TERM

say "téléchargement de $appimage_name…"
curl -fL --progress-bar -o "$work/$appimage_name" "$appimage_url"
curl -fsSL -o "$work/SHA256SUMS.txt" "$sums_url"

expected=$(grep -E "[ */]$appimage_name\$" "$work/SHA256SUMS.txt" | awk '{print $1}' | head -n 1)
[ -n "$expected" ] || fail "empreinte de $appimage_name absente de SHA256SUMS.txt."
actual=$(sha256sum "$work/$appimage_name" | awk '{print $1}')
[ "$expected" = "$actual" ] || fail "empreinte SHA-256 incorrecte : téléchargement corrompu."
say "empreinte SHA-256 vérifiée."

chmod +x "$work/$appimage_name"
(cd "$work" && "./$appimage_name" --appimage-extract >/dev/null) ||
  fail "extraction de l'AppImage impossible."
[ -x "$work/squashfs-root/AppRun" ] || fail "AppImage incomplète (AppRun absent)."

# Remplacement de la version installée : l'ancienne n'est supprimée qu'une fois la nouvelle en place.
rm -rf "$INSTALL_DIR/app.old"
[ -d "$INSTALL_DIR/app" ] && mv "$INSTALL_DIR/app" "$INSTALL_DIR/app.old"
mv "$work/squashfs-root" "$INSTALL_DIR/app"
rm -rf "$INSTALL_DIR/app.old"
printf '%s\n' "$version" >"$INSTALL_DIR/version"

mkdir -p "$BIN_DIR"
ln -sf "$INSTALL_DIR/app/AppRun" "$BIN_DIR/jarvis"

# Icônes : celles que l'AppImage fournit pour chaque taille.
found_icon=""
for icon in "$INSTALL_DIR"/app/usr/share/icons/hicolor/*/apps/jarvis.png; do
  [ -f "$icon" ] || continue
  size_dir=$(basename "$(dirname "$(dirname "$icon")")")
  mkdir -p "$ICON_ROOT/$size_dir/apps"
  cp "$icon" "$ICON_ROOT/$size_dir/apps/jarvis.png"
  found_icon=1
done
if [ -z "$found_icon" ] && [ -f "$INSTALL_DIR/app/jarvis.png" ]; then
  mkdir -p "$ICON_ROOT/512x512/apps"
  cp "$INSTALL_DIR/app/jarvis.png" "$ICON_ROOT/512x512/apps/jarvis.png"
fi

# Entrée du menu. Pas de --no-sandbox : le lanceur choisit la sandbox selon le poste.
mkdir -p "$(dirname "$DESKTOP_FILE")"
exec_path=$(printf '%s' "$INSTALL_DIR/app/AppRun" | sed 's/["`$\\]/\\&/g')
cat >"$DESKTOP_FILE" <<EOF
[Desktop Entry]
Type=Application
Name=Jarvis
Comment=Assistant IA de bureau de l'agence
Exec="$exec_path" %U
Icon=jarvis
Terminal=false
Categories=Office;
StartupWMClass=Jarvis
X-Jarvis-Version=$version
EOF
chmod 644 "$DESKTOP_FILE"
refresh_desktop_caches

say "Jarvis $version est installé."
say "  menu des applications : Jarvis"
say "  commande : $BIN_DIR/jarvis"
case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *) say "  ajoutez $BIN_DIR à votre PATH pour lancer « jarvis » depuis un terminal." ;;
esac

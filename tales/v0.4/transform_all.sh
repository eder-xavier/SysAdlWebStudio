#!/bin/bash
# Script para transformar todos os arquivos SysADL para JavaScript

#!/bin/bash
# Normaliza o diretório de execução para o diretório do script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

echo "🔄 Transformando arquivos SysADL para JavaScript..."

# Criar pasta generated se não existir
mkdir -p generated

# Lista de arquivos SysADL para transformar
SYSADL_FILES=(
    "Simple.sysadl"
    "AGV.sysadl" 
    "RTC.sysadl"
    "SmartPlace.sysadl"
)

# Transformar cada arquivo
for file in "${SYSADL_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  Transformando $file..."
        node transformer.js "$file" "./generated/${file%.sysadl}.js"
        echo "  ✅ Gerado: generated/${file%.sysadl}.js"
    else
        echo "  ⚠️  Arquivo não encontrado: $file"
    fi
done

echo "🎉 Transformação concluída!"
echo ""
echo "📁 Arquivos gerados em ./generated/:"
JS_FILES=(generated/*.js)
if [ -e "${JS_FILES[0]}" ]; then
    for f in "${JS_FILES[@]}"; do
        printf "  %s (%d bytes)\n" "$f" "$(stat -f%z "$f")"
    done
else
    echo "  (nenhum arquivo .js encontrado)"
fi

# Consolidar arquivos .js gerados em subdiretórios (ex.: generated/1/*.js)
echo "\n🔁 Consolidando arquivos .js de subpastas para ./generated/ (se houver)..."
find generated -mindepth 2 -maxdepth 3 -type f -name '*.js' -print | while read -r jsfile; do
    dest="generated/$(basename "$jsfile")"
    if [ -e "$dest" ]; then
        echo "  ⚠️  Já existe $dest — mantendo ambos: renomeando $(basename "$jsfile") para $(basename "$jsfile")"  # keep both; do not overwrite
        # If collision, append a numeric suffix
        i=1
        base="$(basename "$jsfile" .js)"
        while [ -e "generated/${base}_$i.js" ]; do i=$((i+1)); done
        mv "$jsfile" "generated/${base}_$i.js"
        echo "  -> moved to generated/${base}_$i.js"
    else
        mv "$jsfile" "$dest"
        echo "  -> moved $(basename "$jsfile") to generated/"
    fi
done

echo "Consolidação concluída."
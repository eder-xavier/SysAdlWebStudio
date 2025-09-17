#!/bin/bash
# Script para transformar todos os arquivos SysADL para JavaScript

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
ls -la generated/*.js | awk '{print "  " $9 " (" $5 " bytes)"}'
#!/bin/bash

# Actualiza la lista de paquetes
apt-get update 

# Instala Chromium solo si no está instalado
if ! command -v chromium-browser &> /dev/null; then
    echo "Chromium no está instalado. Instalando..."
    apt-get install -y chromium-browser
else
    echo "Chromium ya está instalado."
fi

# Verifica que Chromium esté instalado
which chromium-browser

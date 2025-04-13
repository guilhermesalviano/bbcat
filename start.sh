#!/bin/bash

echo "🐍 Criando ambiente virtual..."
python3 -m venv venv

echo "✅ Ativando ambiente..."
source venv/bin/activate

echo "📦 Gerando requirements.txt..."
cat <<EOF > requirements.txt
flask
opencv-python-headless
EOF

echo "📥 Instalando dependências..."
pip install --upgrade pip
pip install -r requirements.txt

echo "🚀 Iniciando a aplicação..."
python main.py

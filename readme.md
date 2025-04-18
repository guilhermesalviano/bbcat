# BBCAT
This is a project to watch my cats while I'm traveling.
It's self-hosted on an old notebook, and I can access it using Tailscale (a VPN).

To stream the camera feed, I'm using the app "DroidCam" on an old cellphone. As a backup, I have a webcam that initially takes photos at specific moments.

The nexts steps is create a short ML agent to indentify empty bowl and send notifications.

## to'do:
- [x] overwrite na controle da camera.
- [x] pagina com o status do servidor - acompanhar temperaturas
- [x] setup do projeto com pm2
- [x] setup da VPN com tailscale
- [x] tablet para ser o droid cam e renderizar minha camera tbm para os gatinhos.
- [x] webcam para fotos do ambiente
- [ ] permissões não serem requisitadas dnv no tablet
- [ ] site desconectar o tablet
- [ ] macrodroid ou AutomateIt para abrir a guia no navegador
- [ ] usb-camera ligada 100% no servidor
- [ ] enviar notificações no wpp
- [ ] serviço para salvar snapshots a cada hora e enviar para o wpp


### start project
```
npm install -g pm2
pm2 start processes.json
```

## https using ip in auto-host
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout private.key -out certificate.crt

For "Common Name", enter your server's IP address (e.g., 192.168.18.16)

note: probably you will use VPN to access your local network, so it doesn't matter if you configure a .local domain in your server.

## Errors
- video0 permission
```sh
sudo chmod 666 /dev/video0
```


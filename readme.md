## to'do:
- [x] overwrite na controle da camera.
- [x] pagina com o status do servidor - acompanhar temperaturas
- [x] setup do projeto com pm2
- [x] setup da VPN com tailscale
- [x] tablet para ser o droid cam e renderizar minha camera tbm para os gatinhos.
- [ ] create a very short ML algoritmo to analyse a photo each hour and send a notification in whatsapp. 
- [ ] permissões não serem requisitadas dnv no tablet
- [ ] site desconectar o tablet
- [ ] macrodroid ou AutomateIt para abrir a guia no navegador
- [ ] usb-camera ligada 100% no servidor
- [ ] enviar notificações no wpp
- [ ] serviço para salvar snapshots a cada hora e enviar para o wpp
- [ ] webcam para fotos tbm - redundancia?


### start process with pm2
```
pm2 start processes.json
```

### check status

```
pm2 status
```

### stop

```
pm2 stop all
```

openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout private.key -out certificate.crt

For "Common Name", enter your server's IP address (e.g., 192.168.18.16)

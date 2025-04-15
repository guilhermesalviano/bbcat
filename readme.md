to'do:
- [x] overwrite na controle da camera.
- [ ] pagina com o status do servidor - acompanhar temperaturas
- [ ] setup do projeto com pm2
- [ ] setup da VPN com tailscale
- [ ] setup do TeamViewer
- [ ] tablet para ser o droid cam e renderizar minha camera tbm para os gatinhos.
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

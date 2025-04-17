import { Request, Response, Router } from 'express';
import { exec } from 'child_process';
import fs from 'fs';
import os from 'os';
import axios from 'axios';
import NodeWebcam from 'node-webcam';
import { ApiResponse, SystemInfo } from '../types';
import dotenv from 'dotenv';
dotenv.config();

const startTime = new Date();
const router = Router();
const MJPEG_URL = process.env.MJPEG_URL;
if (!MJPEG_URL) {
    throw new Error('MJPEG_URL não está definido no arquivo .env');
}

const webcam = NodeWebcam.create({
    width: 2560,
    height: 1440,
    quality: 100,
    saveShots: false,
    output: 'jpeg',
    device: false,
    callbackReturn: 'base64',
    verbose: true,
});

router.get(['/camera', '/living-room'], (req, res) => {
    const date = new Date().toISOString().replace(/T/, '-').replace(/\:.+/, '');

    webcam.capture(`./temp/usb_camera-${date}.jpeg`, (err, data) => {
        if (err) {
            console.error('Erro ao capturar imagem da webcam USB:', err);
            return res.status(500).json({
                error: 'Não foi possível capturar a imagem da webcam USB',
            });
        }

        // Define o tipo de conteúdo como HTML
        res.set('Content-Type', 'text/html');

        // Envia um HTML contendo a tag <img> com a imagem em base64
        res.send(`
        <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Living Room</title>
                <style>
                    /* Resetting margin and padding for better control */
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }

                    /* Full screen height and background color */
                    body {
                        font-family: Arial, sans-serif;
                        height: 100vh;
                        width: 100%;
                        background-color: rgb(48, 48, 48);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        text-align: center;
                    }

                    /* Main container styling */
                    .container {
                        padding: 8px;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        background-color: rgba(255, 255, 255, 0.1); /* semi-transparent background */
                        border-radius: 8px; /* rounded corners */
                        box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.3); /* subtle shadow */
                    }

                    /* Header text styling */
                    h1 {
                        color: #fefefe;
                        margin-bottom: 20px;
                        font-size: 2rem;
                    }

                    /* Image styling for responsiveness */
                    img {
                        width: 90%;
                        max-width: 100%; /* Ensures image is responsive */
                        border-radius: 8px;
                    }

                    /* Responsive adjustments for smaller screens */
                    @media (max-width: 768px) {
                        h1 {
                            font-size: 1.5rem;
                        }
                        img {
                            width: 90%;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Living room in ${date}</h1>
                    <img src="${data}" alt="Webcam USB" />
                </div>
            </body>
            </html>
        `);
    });
});

router.get('/', (req: Request, res: Response) => {
    const systemInfo: SystemInfo = {
        status: 'online',
        uptime: {
            server: os.uptime(),
            api: Math.floor(
                (new Date().getTime() - startTime.getTime()) / 1000,
            ),
        },
        memory: {
            total: Math.round(os.totalmem() / (1024 * 1024)) + ' MB',
            free: Math.round(os.freemem() / (1024 * 1024)) + ' MB',
            usage: Math.round((1 - os.freemem() / os.totalmem()) * 100) + '%',
        },
        cpu: {
            model: os.cpus()[0].model,
            cores: os.cpus().length,
            load: os.loadavg(),
        },
        hostname: os.hostname(),
        platform: os.platform(),
        osRelease: os.release(),
        // networkInterfaces: os.networkInterfaces()
    };

    // Tentar obter temperatura da CPU (disponível em muitos sistemas Ubuntu)
    fs.readFile(
        '/sys/class/thermal/thermal_zone0/temp',
        'utf8',
        (err, data) => {
            if (!err) {
                systemInfo.cpu.temperature =
                    Math.round(parseInt(data) / 1000) + ' °C';
            }

            // Obter uso de disco
            exec('df -h /', (err, stdout) => {
                if (!err) {
                    const lines = stdout.trim().split('\n');
                    if (lines.length > 1) {
                        const diskInfo = lines[1].split(/\s+/);
                        systemInfo.disk = {
                            total: diskInfo[1],
                            used: diskInfo[2],
                            available: diskInfo[3],
                            usagePercent: diskInfo[4],
                        };
                    }

                    // Finalmente, retornar todas as informações junto com os endpoints
                    const response: ApiResponse = {
                        ...systemInfo,
                        endpoints: {
                            '/stream': 'Acessa o stream MJPEG diretamente',
                            '/api/stream-info':
                                'Retorna informações sobre o stream',
                            '/api/snapshot': 'Captura um frame do stream',
                        },
                    };

                    res.json(response);
                } else {
                    // Se o comando df falhar, retornar o que já temos
                    const response: ApiResponse = {
                        ...systemInfo,
                        endpoints: {
                            '/stream': 'Acessa o stream MJPEG diretamente',
                            '/api/stream-info':
                                'Retorna informações sobre o stream',
                            '/api/snapshot': 'Captura um frame do stream',
                        },
                    };

                    res.json(response);
                }
            });
        },
    );
});

router.get(['/stream', '/food'], async (req, res) => {
    try {
        const response = await axios({
            url: MJPEG_URL + '/video',
            method: 'GET',
            responseType: 'stream',
        });

        // Configura os cabeçalhos da resposta
        res.set('Content-Type', response.headers['content-type']);
        res.set('Cache-Control', 'no-cache');
        res.set('Connection', 'keep-alive');

        let data = '';
        response.data.on('data', (chunk: any) => {
            data += chunk;
        });

        response.data.on('end', async () => {
            if (data.includes('<a href="/override">')) {
                try {
                    await axios.get(`${MJPEG_URL}/override`);
                    console.log('Override triggered successfully');
                } catch (err) {
                    console.error('Error triggering override:', err);
                }
            }
        });

        // Encaminha o stream
        response.data.pipe(res);
    } catch (error) {
        console.error('Erro ao acessar o stream:', error);
        res.status(500).json({
            error: 'Não foi possível conectar ao stream MJPEG',
        });
    }
});

export default router;

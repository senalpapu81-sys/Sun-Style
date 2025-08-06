const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const QRCode = require('qrcode');
const { createCanvas } = require('canvas');
const JsBarcode = require('jsbarcode');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;

// Configuración de la base de datos SQLite
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Error al conectar con la base de datos:', err.message);
    } else {
        console.log('Conectado a la base de datos SQLite.');
        db.run(`CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            description TEXT,
            tags TEXT,
            price REAL,
            image TEXT
        )`);
    }
});

// Configuración de multer para la subida de imágenes
const storage = multer.diskStorage({
    destination: './public/images/',
    filename: (req, file, cb) => {
        cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage: storage });

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Ruta principal para mostrar el catálogo
app.get('/', (req, res) => {
    db.all('SELECT * FROM items', [], (err, rows) => {
        if (err) {
            throw err;
        }
        res.render('index', { items: rows });
    });
});

// Ruta para agregar una nueva prenda
app.post('/add-item', upload.single('image'), (req, res) => {
    const { name, description, tags, price } = req.body;
    const image = req.file ? req.file.filename : null;

    if (name && description && price && image) {
        db.run(`INSERT INTO items (name, description, tags, price, image) VALUES (?, ?, ?, ?, ?)`,
            [name, description, tags, price, image], function (err) {
                if (err) {
                    console.error(err.message);
                    return res.status(500).send('Error al agregar el item.');
                }
                const newItem = {
                    id: this.lastID,
                    name,
                    description,
                    tags,
                    price,
                    image
                };
                io.emit('new-item', newItem); // Notifica a todos los clientes
                res.redirect('/');
            });
    } else {
        res.status(400).send('Faltan campos obligatorios.');
    }
});

// Ruta para ver los detalles de una prenda y generar QR/código de barras
app.get('/item/:id', async (req, res) => {
    const itemId = req.params.id;
    db.get('SELECT * FROM items WHERE id = ?', [itemId], async (err, row) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Error al obtener el item.');
        }
        if (row) {
            try {
                // Generar código QR
                const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify({
                    id: row.id,
                    name: row.name,
                    price: row.price
                }));

                // Generar código de barras
                const barcodeCanvas = createCanvas(200, 50);
                JsBarcode(barcodeCanvas, row.id.toString(), {
                    format: "CODE128",
                    displayValue: true
                });
                const barcodeDataUrl = barcodeCanvas.toDataURL();
                
                res.render('item', { item: row, qrCode: qrCodeDataUrl, barcode: barcodeDataUrl });
            } catch (qrErr) {
                console.error('Error al generar QR o código de barras:', qrErr);
                res.status(500).send('Error al generar la información del producto.');
            }
        } else {
            res.status(404).send('Prenda no encontrada.');
        }
    });
});


io.on('connection', (socket) => {
    console.log('Un usuario se ha conectado.');
    socket.on('disconnect', () => {
        console.log('Un usuario se ha desconectado.');
    });
});

server.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
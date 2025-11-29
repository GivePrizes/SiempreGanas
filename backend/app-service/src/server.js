import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import appRoutes from './routes/appRoutes.js';

dotenv.config();
const app = express();

app.use(cors({ origin: process.env.CORS_ALLOWED_ORIGINS.split(',') }));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' })); // Importante para base64

app.use('/api', appRoutes);

app.get('/', (req, res) => res.send('APP SERVICE OK'));

const PORT = process.env.PORT || 8082;
app.listen(PORT, () => {
  console.log(`APP SERVICE corriendo en puerto ${PORT} 🚀`);
});
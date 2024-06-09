import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import bodyParser from 'body-parser';
import trashStationRouter from './routes/trashStationRoutes.js';
import userRouter from './routes/userRoutes.js';
import transactionRouter from './routes/transactionRoutes.js';
import requestRouter from './routes/requestRoutes.js';

const app = express();
const port = process.env.PORT;

app.use(bodyParser.json());
app.use(cors());

app.get('/', (req, res) => {
	res.send('Hello World!');
});

app.all('*', (req, res, next) => {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT');
	next();
});

app.use('/trash-stations', trashStationRouter);
app.use('/users', userRouter);
app.use('/transactions', transactionRouter);
app.use('/requests', requestRouter);

app.use((err, req, res, next) => {
	if (res.statusCode === 200) res.status(500);
	console.error('Error: ', err);
	res.json({ status: 'error', message: err.message });
});

app.listen(port, () => {
	console.log(`App listening on port ${port}`);
});

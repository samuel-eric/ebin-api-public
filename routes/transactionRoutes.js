import express from 'express';
import { serverTimestamp } from 'firebase/firestore';
import {
	getAllData,
	addData,
	getDataByRef,
} from '../firebase/firebaseUtils.js';

const transactionRouter = express.Router();

/**
 * GET /transactions
 * Mengembalikan semua transaksi yang ada
 * Mengembalikan array kosong jika tidak ada transaksi
 */
transactionRouter.get('/', async (req, res, next) => {
	try {
		const transData = await getAllData('transaction');
		const result = await Promise.all(
			transData.map(async (trans) => {
				const trashStationData = transData.trashStation
					? await getDataByRef(transData.trashStation)
					: null;
				return {
					...trans,
					timestamp: trans.timestamp.toDate().toDateString(),
					trashStation: trashStationData ? trashStationData.id : null,
				};
			})
		);
		res.json(result);
	} catch (error) {
		next(error);
	}
});

/**
 * GET /transaction/:id
 * Mengembalikan transaksi dengan id yang sesuai
 * Mengembalikan error 404 Not Found jika tidak ada transaksi dengan id tersebut
 */
transactionRouter.get('/:id', async (req, res, next) => {
	const id = req.params.id;
	try {
		const transData = await getData('transaction', id);
		const trashStationData = await getDataByRef(transData.trashStation);
		const result = {
			...transData,
			trashStation: trashStationData.id,
			timestamp: result.timestamp.toDate().toDateString(),
		};
		if (result) {
			res.json(result);
		} else {
			res.status(404);
			throw new Error('There is no transaction with that ID');
		}
	} catch (error) {
		next(error);
	}
});

/**
 * POST /transactions
 * Menambah transaksi baru
 * Membutuhkan input reward, paper, dan plastic (paper dan plastic dalam gram)
 * Jarang dipakai lagi, pakai PUT /user/:id/transactions buat tambah transaksi
 */
transactionRouter.post('/', async (req, res, next) => {
	const { reward, paper, plastic } = req.body;
	try {
		if (reward === undefined || paper === undefined || plastic === undefined) {
			res.status(400);
			throw new Error('Please input all fields');
		}
		const id = Date.now().toString();
		const data = {
			timestamp: serverTimestamp(),
			reward,
			trash: {
				paper,
				plastic,
			},
		};
		const result = await addData('transaction', id, data);
		if (result) {
			res.status(201);
			res.json({ message: 'Transaction successfully created', ...result });
		} else {
			throw new Error('Fail to create transaction');
		}
	} catch (error) {
		next(error);
	}
});

export default transactionRouter;

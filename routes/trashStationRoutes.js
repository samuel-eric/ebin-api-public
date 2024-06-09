import express from 'express';
import { GeoPoint } from 'firebase/firestore';
import {
	getAllData,
	getData,
	addData,
	updateData,
	getDataByRef,
} from '../firebase/firebaseUtils.js';

const trashStationRouter = express.Router();

/**
 * GET /trash-stations
 * Mengembalikan seluruh trash station
 * Mengembalikan array kosong jika tidak ada trash station
 */
trashStationRouter.get('/', async (req, res, next) => {
	try {
		const trashStationData = await getAllData('trashStation');
		const result = await Promise.all(
			trashStationData.map(async (trashStation) => {
				let transactionToDisplay;
				if (trashStation.transaction.length > 0) {
					transactionToDisplay = await Promise.all(
						trashStation.transaction.map(async (trans) => {
							const transData = await getDataByRef(trans);
							const trashStationData = await getDataByRef(
								transData.trashStation
							);
							return {
								...transData,
								trashStation: trashStationData.id,
								timestamp: transData.timestamp.toDate().toDateString(),
							};
						})
					);
				}
				return {
					...trashStation,
					transaction: transactionToDisplay,
				};
			})
		);
		res.json(result);
	} catch (error) {
		next(error);
	}
});

/**
 * GET /trash-stations/:id
 * Mengembalikan trash station dengan ID tersebut
 * Mengembalikan 404 Error Not Found jika tidak ada trash station dengan ID tersebut
 */
trashStationRouter.get('/:id', async (req, res, next) => {
	const id = req.params.id;
	try {
		const trashStationData = await getData('trashStation', id);
		if (trashStationData) {
			const transactionToDisplay = await Promise.all(
				trashStationData.transaction?.map(async (trans) => {
					const transData = await getDataByRef(trans);
					const trashStationData = await getDataByRef(transData.trashStation);
					return {
						...transData,
						trashStation: trashStationData.id,
						timestamp: transData.timestamp.toDate().toDateString(),
					};
				})
			);
			res.json({ ...trashStationData, transaction: transactionToDisplay });
		} else {
			res.status(404);
			throw new Error('There is no trash station with that ID');
		}
	} catch (error) {
		next(error);
	}
});

/**
 * POST /trash-stations
 * Menambah trash station
 * Membutuhkan id, lat, long, capacity, available, openTime, closeTime
 */
trashStationRouter.post('/', async (req, res, next) => {
	const { id, lat, long, capacity, available, openTime, closeTime, address } =
		req.body;
	try {
		if (
			id === undefined ||
			lat === undefined ||
			long === undefined ||
			capacity === undefined ||
			available === undefined ||
			openTime === undefined ||
			closeTime === undefined ||
			address === undefined
		) {
			res.status(400);
			throw new Error('Please input all fields!');
		}
		if (capacity > 100 || capacity < 0) {
			res.status(400);
			throw new Error('Capacity is between 0-100%');
		}
		const data = {
			id,
			location: new GeoPoint(lat, long),
			available: capacity === 100 ? false : available,
			address,
			capacity,
			openHours: {
				openTime,
				closeTime,
			},
			transaction: [],
		};
		const result = await addData('trashStation', id, data);
		if (result) {
			res.status(201);
			res.json({ message: 'Trash station successfully created', ...result });
		} else {
			throw new Error('Fail to create trash station');
		}
	} catch (error) {
		next(error);
	}
});

/**
 * PUT /trash-stations/:id
 * Mengubah detail trash station
 * Membutuhkan field lat, long, capacity, available, openTime, closeTime
 */
trashStationRouter.put('/:id', async (req, res, next) => {
	const id = req.params.id;
	const { lat, long, capacity, available, openTime, closeTime, address } =
		req.body;
	try {
		if (
			lat === undefined ||
			long === undefined ||
			capacity === undefined ||
			available === undefined ||
			openTime === undefined ||
			closeTime === undefined ||
			address === undefined
		) {
			res.status(400);
			throw new Error('Please input all fields!');
		}
		if (capacity > 100 || capacity < 0) {
			res.status(400);
			throw new Error('Capacity is between 0-100%');
		}
		const data = {
			location: new GeoPoint(lat, long),
			available: capacity === 100 ? false : available,
			capacity,
			address,
			openHours: {
				openTime,
				closeTime,
			},
		};
		const result = await updateData('trashStation', id, data);
		if (result) {
			res.status(200);
			res.json({ message: 'Trash station successfully updated', ...result });
		} else {
			throw new Error('Fail to update trash station');
		}
	} catch (error) {
		next(error);
	}
});

/**
 * PUT /trash-stations/:id/capacity
 * Mengubah capacity trash station
 * Membutuhkan field capacity
 */
trashStationRouter.put('/:id/capacity', async (req, res, next) => {
	const id = req.params.id;
	const { capacity } = req.body;
	try {
		if (capacity === undefined) {
			res.status(400);
			throw new Error('Please input all fields!');
		}
		if (capacity >= 100 || capacity <= 0) {
			res.status(400);
			throw new Error('Capacity is between 0-100%');
		}
		const trashStationData = await getData('trashStation', id);
		const data = {
			...trashStationData,
			capacity,
		};
		const result = await updateData('trashStation', id, data);
		const transactionToDisplay = await Promise.all(
			result.transaction?.map(async (trans) => {
				const transData = await getDataByRef(trans);
				const trashStationData = await getDataByRef(transData.trashStation);
				return {
					...transData,
					trashStation: trashStationData.id,
					timestamp: transData.timestamp.toDate().toDateString(),
				};
			})
		);
		if (result) {
			res.status(200);
			res.json({
				message: 'Trash station successfully updated',
				...result,
				transaction: transactionToDisplay,
			});
		} else {
			throw new Error('Fail to update trash station');
		}
	} catch (error) {
		next(error);
	}
});
export default trashStationRouter;

import express from 'express';
import { serverTimestamp } from 'firebase/firestore';
import {
	addData,
	getAllData,
	getData,
	getDocRef,
	getDataByRef,
	updateData,
	getUserByID,
	createUser,
	updateUser,
} from '../firebase/firebaseUtils.js';

const userRouter = express.Router();

/**
 * GET /users
 * Mengembalikan seluruh user
 * Mengembalikan array kosong jika tidak ada user
 */
userRouter.get('/', async (req, res, next) => {
	try {
		const userRecords = await getAllData('user');
		const result = await Promise.all(
			userRecords.map(async (record) => {
				let transactionToDisplay = [];
				let requestToDisplay = [];
				if (record.transaction.length !== 0) {
					transactionToDisplay = await Promise.all(
						record.transaction.map(async (trans) => {
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
				if (record.request.length !== 0) {
					requestToDisplay = await Promise.all(
						record.request.map(async (req) => {
							const reqData = await getDataByRef(req);
							const receiverData = await getDataByRef(reqData.receiverID);
							const senderData =
								reqData.senderID !== null
									? await getDataByRef(reqData.senderID)
									: null;
							return {
								...reqData,
								end: reqData.end ? reqData.end.toDate().toDateString() : null,
								start: reqData.start.toDate().toDateString(),
								receiverID: receiverData.name,
								senderID: senderData ? senderData.name : null,
							};
						})
					);
				}
				return {
					...record,
					transaction: transactionToDisplay,
					request: requestToDisplay,
				};
			})
		);
		res.json(result);
	} catch (error) {
		next(error);
	}
});

/**
 * GET /users/:id
 * Mengembalikan detail user dengan ID tersebut
 * Mengembalikan error 404 Not Found jika tidak user dengan ID tersebut
 */
userRouter.get('/:id', async (req, res, next) => {
	const id = req.params.id;
	try {
		const userData = await getData('user', id);
		if (!userData) {
			res.status('404');
			throw new Error('There is no user with that ID');
		}
		const transactionToDisplay = await Promise.all(
			userData.transaction?.map(async (trans) => {
				const transData = await getDataByRef(trans);
				const trashStationData = await getDataByRef(transData.trashStation);
				return {
					...transData,
					trashStation: trashStationData.id,
					timestamp: transData.timestamp.toDate().toDateString(),
				};
			})
		);
		const requestToDisplay = await Promise.all(
			userData.request?.map(async (req) => {
				const reqData = await getDataByRef(req);
				const receiverID = await getDataByRef(reqData.receiverID);
				const senderID = reqData.senderID
					? await getDataByRef(reqData.senderID)
					: null;
				return {
					...reqData,
					end: reqData.end ? reqData.end.toDate().toDateString() : null,
					start: reqData.start.toDate().toDateString(),
					receiverID: receiverID.name,
					senderID: senderID.name,
				};
			})
		);
		const result = {
			...userData,
			transaction: transactionToDisplay,
			request: requestToDisplay,
		};
		res.json(result);
	} catch (error) {
		next(error);
	}
});

/**
 * POST /users
 * Menambah user baru
 * Membutuhkan field id, fullname, dan address
 * Dilakukan setelah aplikasi melakukan authentication dengan Firebase Auth
 */
userRouter.post('/', async (req, res, next) => {
	const { id, email, fullname, username, phone, address } = req.body;
	try {
		if (
			id === undefined ||
			email === undefined ||
			fullname === undefined ||
			username === undefined ||
			phone === undefined ||
			address === undefined
		) {
			throw new Error('Please input all fields');
		}
		const data = {
			id,
			email,
			fullname,
			username,
			phone,
			address,
			point: 0,
			transaction: [],
			request: [],
		};
		const result = await addData('user', id, data);
		if (result) {
			res.json({
				message: 'User data saved successfully',
				...result,
			});
		}
	} catch (error) {
		next(error);
	}
});

/**
 * PUT /users/:id
 * Mengubah detail user dengan ID tersebut
 * Tidak membutuhkan seluruh field, hanya field yg ingin diganti saja
 */
userRouter.put('/:id', async (req, res, next) => {
	const id = req.params.id;
	try {
		const oldDataFromFirestore = await getData('user', id);
		const oldDataFromAuth = await getUserByID(id);
		if (!oldDataFromFirestore || !oldDataFromAuth) {
			res.status(404);
			throw new Error('User not found');
		}
		const updateToFirestore = await updateData('user', id, {
			...oldDataFromFirestore,
			email: req.body.email || oldDataFromFirestore.email,
			fullname: req.body.fullname || oldDataFromFirestore.fullname,
			address: req.body.address || oldDataFromFirestore.address,
			phone: req.body.phone || oldDataFromFirestore.phone,
			username: req.body.username || oldDataFromFirestore.username,
		});
		const updateToAuth = await updateUser(id, {
			email: req.body.email || oldDataFromAuth.email,
			password: req.body.password || oldDataFromAuth.password,
		});
		const transactionToDisplay = await Promise.all(
			updateToFirestore.transaction?.map(async (trans) => {
				const transData = await getDataByRef(trans);
				const trashStationData = await getDataByRef(transData.trashStation);
				return { ...transData, trashStation: trashStationData };
			})
		);
		const requestToDisplay = await Promise.all(
			updateToFirestore.request?.map(async (req) => {
				const reqData = await getDataByRef(req);
				const receiverID = await getDataByRef(reqData.receiverID);
				const senderID = reqData.senderID
					? await getDataByRef(reqData.senderID)
					: null;
				return { ...reqData, receiverID: receiverID.id, senderID: senderID.id };
			})
		);
		if (updateToFirestore && updateToAuth) {
			const result = {
				...updateToFirestore,
				transaction: transactionToDisplay,
				request: requestToDisplay,
			};
			res.json(result);
		} else {
			throw new Error("Failed to update user's data");
		}
	} catch (error) {
		next(error);
	}
});

/**
 * PUT /users/:id/transaction
 * Menambah transaksi baru untuk user dengan ID tersebut
 * Membutuhkan field reward, paper, plastic, dan trashStationID untuk membuat transaksi baru
 */
userRouter.put('/:id/transaction', async (req, res, next) => {
	const id = req.params.id;
	const { reward, paper, plastic, trashStationID } = req.body;
	try {
		if (
			reward === undefined ||
			paper === undefined ||
			plastic === undefined ||
			trashStationID === undefined
		) {
			throw new Error('Please input all fields!');
		}
		const oldUserData = await getData('user', id);
		if (!oldUserData) {
			res.status(404);
			throw new Error('User not found');
		}
		const trashStationRef = getDocRef('trashStation', trashStationID);
		const oldTrashStationData = await getDataByRef(trashStationRef);
		if (!oldTrashStationData) {
			res.status(404);
			throw new Error('Trash station not found');
		}
		const transactionId = Date.now().toString();
		const transaction = await addData('transaction', transactionId, {
			id: transactionId,
			timestamp: serverTimestamp(),
			reward,
			trash: {
				paper,
				plastic,
			},
			trashStation: trashStationRef,
			user: oldUserData.username,
		});
		const transactionDoc = getDocRef('transaction', transactionId);
		const newTrashStationData = {
			...oldTrashStationData,
			transaction:
				oldTrashStationData.transaction.length === 0
					? [transactionDoc]
					: [...oldTrashStationData.transaction, transactionDoc],
		};
		const updateTrashStation = await updateData(
			'trashStation',
			trashStationID,
			newTrashStationData
		);
		const newUserData = {
			...oldUserData,
			transaction:
				oldUserData.transaction.length === 0
					? [transactionDoc]
					: [...oldUserData.transaction, transactionDoc],
			point: oldUserData.point + reward,
		};
		const result = await updateData('user', id, newUserData);
		const transactionToDisplay = await Promise.all(
			result.transaction.map(async (trans) => {
				const transData = await getDataByRef(trans);
				const trashStationData = await getDataByRef(transData.trashStation);
				return {
					...transData,
					trashStation: trashStationData.id,
					timestamp: transData.timestamp.toDate().toDateString(),
				};
			})
		);
		const requestToDisplay = await Promise.all(
			result.request.map(async (req) => {
				const reqData = await getDataByRef(req);
				const receiverData = await getDataByRef(reqData.receiverID);
				const senderData =
					reqData.senderID !== null
						? await getDataByRef(reqData.senderID)
						: null;
				return {
					...reqData,
					end: reqData.end ? reqData.end.toDate().toDateString() : null,
					start: reqData.start.toDate().toDateString(),
					receiverID: receiverData.name,
					senderID: senderData ? senderData.name : null,
				};
			})
		);
		if (result) {
			res.json({
				...result,
				transaction: transactionToDisplay,
				request: requestToDisplay,
			});
		} else {
			throw new Error("Failed to update user's transaction");
		}
	} catch (error) {
		next(error);
	}
});

export default userRouter;

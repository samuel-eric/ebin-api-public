import express from 'express';
import { serverTimestamp } from 'firebase/firestore';
import {
	getAllData,
	getData,
	getDocRef,
	addData,
	updateData,
	getDataByRef,
} from '../firebase/firebaseUtils.js';

const requestRouter = express.Router();

/**
 * GET /requests
 * Mengembalikan seluruh requests
 * Mengembalikan array kosong jika tidak ada request
 */
requestRouter.get('/', async (req, res, next) => {
	try {
		const requestRecords = await getAllData('request');
		const result = await Promise.all(
			requestRecords.map(async (request) => {
				const receiverData = await getDataByRef(request.receiverID);
				const senderData =
					request.senderID !== null
						? await getDataByRef(request.senderID)
						: null;
				return {
					...request,
					end: request.end ? request.end.toDate().toDateString() : null,
					start: request.start.toDate().toDateString(),
					receiverID: { username: receiverData.username, id: receiverData.id },
					senderID: senderData
						? { username: senderData.username, id: senderData.id }
						: null,
				};
			})
		);
		res.json(result);
	} catch (error) {
		next(error);
	}
});

/**
 * POST /requests
 * Menambah request baru
 * Membutuhkan field receiverID, title, description, address, dan reward
 */
requestRouter.post('/', async (req, res, next) => {
	const { receiverID, title, description, address, reward } = req.body;
	try {
		if (
			receiverID === undefined ||
			title === undefined ||
			description === undefined ||
			address === undefined ||
			reward === undefined
		) {
			throw new Error('Please input all fields');
		}
		const receiverData = await getData('user', receiverID);
		if (!receiverData) {
			res.status(404);
			throw new Error('User not found');
		}
		const id = Date.now().toString();
		const data = {
			id,
			receiverID: getDocRef('user', receiverID),
			senderID: null,
			status: 'initial',
			start: serverTimestamp(),
			end: null,
			title,
			description,
			address,
			reward,
		};
		const requestData = await addData('request', id, data);
		const result = {
			...requestData,
			start: requestData.start.toDate().toDateString(),
			receiverID: { username: receiverData.username, id: receiverData.id },
		};
		res.send(result);
	} catch (error) {
		next(error);
	}
});

function checkStatus(oldStatus, newStatus) {
	const allStatus = {
		initial: 1,
		taken: 2,
		delivery: 3,
		'on hold': 4,
		returning: 5,
		end: 6,
	};
	if (allStatus[oldStatus] === 3) {
		return allStatus[newStatus] === 4 || allStatus[newStatus] === 6;
	} else if (allStatus[oldStatus] === 4) {
		return allStatus[newStatus] === 5 || allStatus[newStatus] === 6;
	} else if (allStatus[oldStatus] === 5) {
		return allStatus[newStatus] === 1;
	} else {
		return allStatus[newStatus] - allStatus[oldStatus] === 1;
	}
}

async function addCompletedRequestToUser(
	requestID,
	senderID,
	receiverID,
	reward
) {
	const requestDoc = getDocRef('request', requestID);
	const oldReceiverData = await getData('user', receiverID);
	const newReceiverData = {
		...oldReceiverData,
		request:
			oldReceiverData.request.length === 0
				? [requestDoc]
				: [...oldReceiverData.request, requestDoc],
	};
	const updatedReceiverData = await updateData(
		'user',
		receiverID,
		newReceiverData
	);
	const oldSenderData = await getData('user', senderID);
	const newSenderData = {
		...oldSenderData,
		request:
			oldSenderData.request.length === 0
				? [requestDoc]
				: [...oldSenderData.request, requestDoc],
		point: oldSenderData.point + reward,
	};
	const updatedSenderData = await updateData('user', senderID, newSenderData);
}

/**
 * PUT /requests/:id
 * Mengubah detail request
 * Tidak membutuhkan semua field, hanya field yg ingin diubah saja
 * Field yg bisa diubah: senderID, status, title, description, address, reward
 */
requestRouter.put('/:id', async (req, res, next) => {
	const id = req.params.id;
	const { senderID, status, title, description, address, reward } = req.body;
	try {
		const oldData = await getData('request', id);
		if (!oldData) {
			res.status(404);
			throw new Error('Request not found!');
		}
		if (status !== undefined && !checkStatus(oldData.status, status)) {
			res.status(400);
			throw new Error('Status change is invalid, please check again!');
		}
		if (status === 'taken' && senderID === undefined) {
			res.status(400);
			throw new Error(
				'Please also input sender ID if the status request is already taken'
			);
		}
		let senderData = null;
		let senderRef;
		if (senderID !== undefined) {
			senderData = await getData('user', senderID);
			if (!senderData) {
				res.status(404);
				throw new Error('Sender not found');
			}
			senderRef = getDocRef('user', senderID);
		}
		const newData = {
			...oldData,
			senderID: oldData.senderID ?? senderRef ?? null,
			status: status ? status : oldData.status,
			end: status === 'end' ? serverTimestamp() : null,
			title: title ? title : oldData.title,
			description: description ? description : oldData.description,
			address: address ? address : oldData.address,
			reward: reward ? reward : oldData.reward,
		};
		const updatedData = await updateData('request', id, newData);
		const receiverData = await getDataByRef(updatedData.receiverID);
		senderData = updatedData.senderID
			? await getDataByRef(updatedData.senderID)
			: null;
		if (status === 'end') {
			addCompletedRequestToUser(
				id,
				senderData.id,
				receiverData.id,
				updatedData.reward
			);
		}
		const result = {
			...updatedData,
			receiverID: { username: receiverData.username, id: receiverData.id },
			senderID: senderData
				? { username: senderData.username, id: senderData.id }
				: null,
		};
		res.json(result);
	} catch (error) {
		next(error);
	}
});

export default requestRouter;

require("dotenv").config();
const connectDB = require("./db");
connectDB();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
	cors: {
		origin: "http://localhost:3000",
		methods: ["GET", "POST"],
	},
});

app.use(cors());

const waitingQueue = [];
const activePairs = new Map();
const userContacts = new Map();

const getSocketById = (socketId) => {
	return io.sockets.sockets.get(socketId);
};

const createSocketPair = async (socket1Id, socket2Id) => {
	const socket1 = getSocketById(socket1Id);
	const socket2 = getSocketById(socket2Id);

	if (!socket1 || !socket2) {
		console.log("One or both sockets not found for pairing");
		return false;
	}

	const roomId = `room-${socket1Id}-${socket2Id}`;

	socket1.join(roomId);
	socket2.join(roomId);

	activePairs.set(socket1Id, { partnerId: socket2Id, roomId });
	activePairs.set(socket2Id, { partnerId: socket1Id, roomId });

	console.log(`Paired ${socket1Id} with ${socket2Id} in room ${roomId}`);

	// Wait then verify both sockets are actually in the room
	setImmediate(async () => {
		const roomSockets = await io.in(roomId).fetchSockets();
		if (roomSockets.length === 2) {
			io.to(roomId).emit("matched", { roomId });
			console.log(`Emitted matched event to room ${roomId}`);
		} else {
			console.error(
				`Room ${roomId} has ${roomSockets.length} sockets, expected 2`
			);
		}
	});
	io.emit("active_users", activePairs.size);
	io.emit("waiting_users", waitingQueue.length);
	return true;
};

io.on("connection", (socket) => {
	console.log("User connected:", socket.id);

	socket.on("ready_for_pair", () => {
		//this is nessarcy since sometimes the client doesnt recive the matched signal, so by first making sure its ready that doesnt happen
		if (waitingQueue.length > 0) {
			//pairing is FIFO
			const partner = waitingQueue.shift();
			createSocketPair(socket.id, partner);
		} else {
			//if no one avalilbe add self to queue
			waitingQueue.push(socket.id);
			io.emit("waiting_users", waitingQueue.length);
		}
	});

	socket.on("get_size_counts", () => {
		socket.emit("active_users", activePairs.size);
		socket.emit("waiting_users", waitingQueue.length);
	});
	socket.on("send_message", (message) => {
		const pair = activePairs.get(socket.id);
		if (pair) {
			socket.to(pair.roomId).emit("receive_message", message);
		}
	});
	socket.on("next", () => {
		const pair = activePairs.get(socket.id);

		//delete room and pair
		if (pair) {
			const partnerId = pair.partnerId;
			const roomId = pair.roomId;

			const partnerSocket = io.sockets.sockets.get(partnerId);
			if (partnerSocket) {
				partnerSocket.leave(roomId);
				partnerSocket.emit("partner_disconnected");
				activePairs.delete(partnerId);
				//add to q
			}

			socket.leave(roomId);
			activePairs.delete(socket.id);
		}

		//add to q
		if (!waitingQueue.includes(socket.id)) {
			waitingQueue.push(socket.id);
		}
		//adds partner to q
		if (pair) {
			if (!waitingQueue.includes(pair.partnerId)) {
				waitingQueue.push(pair.partnerId);
			}
		}

		//>1 since being pushed to queue before checking list
		if (waitingQueue.length > 1) {
			const first = waitingQueue.shift();
			const second = waitingQueue.shift();
			if (first && second) {
				createSocketPair(first, second);
			}
		}

		io.emit("waiting_users", waitingQueue.length);
	});
	//connect request
	socket.on("request_save_contact", () => {
		const pair = activePairs.get(socket.id);
		if (!pair) return;

		const partnerSocket = io.sockets.sockets.get(pair.partnerId);
		if (partnerSocket) {
			partnerSocket.emit("contact_request", { from: socket.id });
		}
	});
	//connect response
	socket.on("respond_save_contact", ({ from, accepted }) => {
		const requesterSocket = io.sockets.sockets.get(from);
		const responderId = socket.id;

		if (!requesterSocket) return;

		if (accepted) {
			//both users are connected/are added to contacts
			if (!userContacts.has(from)) userContacts.set(from, []);
			if (!userContacts.has(responderId)) userContacts.set(responderId, []);

			userContacts
				.get(from)
				.push({ id: responderId, nickname: "Saved Stranger" });
			userContacts
				.get(responderId)
				.push({ id: from, nickname: "Saved Stranger" });

			// tell both contact saved
			requesterSocket.emit("contact_saved", { success: true });
			socket.emit("contact_saved", { success: true });
		} else {
			requesterSocket.emit("contact_saved", {
				success: false,
				reason: "declined",
			});
		}
	});

	socket.on("disconnect", () => {
		const pair = activePairs.get(socket.id);

		//if user in waiting list remove them
		const index = waitingQueue.indexOf(socket.id);
		if (index !== -1) {
			waitingQueue.splice(index, 1);
		}

		//if user was paired up delete room
		if (pair) {
			const partner = pair.partnerId;
			const partnerSocket = io.sockets.sockets.get(partner);
			if (partnerSocket) {
				partnerSocket.leave(pair.roomId);
				partnerSocket.emit("partner_disconnected");
				activePairs.delete(partner);
			}
			activePairs.delete(socket.id);
		}

		console.log("User disconnected:", socket.id);
		io.emit("active_users", activePairs.size);
		io.emit("waiting_users", activePairs.size);
	});
});

server.listen(5000, () => {
	console.log("http://localhost:5000");
});
